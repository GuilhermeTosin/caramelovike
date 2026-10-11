-- Business moderation, verification and aggregate ratings are database-owned
-- fields; RLS policies intentionally still allow normal profile edits.

CREATE OR REPLACE FUNCTION public.guard_business_admin_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_actor_id UUID := auth.uid();
  v_is_service_role BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
  v_is_admin BOOLEAN := false;
  v_moderation_changed BOOLEAN;
  v_review_metadata_changed BOOLEAN;
  v_verification_changed BOOLEAN;
  v_rating_function_owner NAME;
BEGIN
  IF v_actor_id IS NOT NULL THEN
    v_is_admin := public.is_admin(v_actor_id);
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Ratings are derived from reviews and cannot be supplied by any client.
    NEW.average_rating := 0;

    IF v_is_service_role OR v_is_admin THEN
      IF NEW.owner_verified IS TRUE
         AND (NEW.owner_verified_until IS NULL OR NEW.owner_verified_until <= statement_timestamp()) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'A verificacao precisa ter uma data de validade futura.';
      END IF;
      RETURN NEW;
    END IF;

    IF v_actor_id IS NULL OR NEW.owner_id IS DISTINCT FROM v_actor_id THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Um negocio so pode ser criado para o usuario autenticado.';
    END IF;

    -- Ignore client-supplied moderation and verification values on creation.
    NEW.moderation_status := 'pending';
    NEW.moderation_reviewed_at := NULL;
    NEW.moderation_reviewed_by := NULL;
    NEW.owner_verified := false;
    NEW.owner_verified_until := NULL;
    RETURN NEW;
  END IF;

  v_moderation_changed :=
    NEW.moderation_status IS DISTINCT FROM OLD.moderation_status;
  v_review_metadata_changed :=
    NEW.moderation_reviewed_at IS DISTINCT FROM OLD.moderation_reviewed_at
    OR NEW.moderation_reviewed_by IS DISTINCT FROM OLD.moderation_reviewed_by;
  v_verification_changed :=
    NEW.owner_verified IS DISTINCT FROM OLD.owner_verified
    OR NEW.owner_verified_until IS DISTINCT FROM OLD.owner_verified_until;

  IF NEW.average_rating IS DISTINCT FROM OLD.average_rating THEN
    SELECT pg_catalog.pg_get_userbyid(proc.proowner)
      INTO v_rating_function_owner
    FROM pg_catalog.pg_proc AS proc
    WHERE proc.oid = 'public.update_business_rating()'::pg_catalog.regprocedure;

    IF pg_catalog.pg_trigger_depth() < 2
       OR current_user IS DISTINCT FROM v_rating_function_owner
       OR pg_catalog.current_setting('app.caramelinho_rating_recalc', true) IS DISTINCT FROM 'on' THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'A nota media e calculada automaticamente pelas avaliacoes.';
    END IF;
  END IF;

  IF v_is_service_role THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id AND NOT v_is_admin THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Somente administradores podem transferir a titularidade do negocio.';
  END IF;

  IF v_moderation_changed THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Somente administradores podem alterar a moderacao do negocio.';
    END IF;

    -- Attribute the decision to the authenticated administrator, not to a
    -- reviewer id or timestamp supplied by the browser.
    NEW.moderation_reviewed_by := v_actor_id;
    NEW.moderation_reviewed_at := statement_timestamp();
  ELSIF v_review_metadata_changed THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Os dados da revisao so podem mudar junto com o status de moderacao.';
  END IF;

  IF v_verification_changed THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'Somente administradores podem alterar a verificacao do negocio.';
    END IF;

    IF NEW.owner_verified IS TRUE THEN
      IF NEW.owner_verified_until IS NULL
         OR NEW.owner_verified_until <= statement_timestamp() THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'A verificacao precisa ter uma data de validade futura.';
      END IF;

      IF NOT EXISTS (
        SELECT 1
        FROM public.business_verification_requests AS request
        WHERE request.business_id = NEW.id
          AND request.status = 'approved'
      ) THEN
        RAISE EXCEPTION USING
          ERRCODE = '23514',
          MESSAGE = 'O selo exige uma solicitacao de verificacao aprovada.';
      END IF;
    ELSE
      NEW.owner_verified_until := NULL;
    END IF;
  END IF;

  -- Editors may update assigned business content, but not any of the fields
  -- protected above. Owners retain the same restriction.
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS a_guard_business_admin_fields ON public.businesses;
CREATE TRIGGER a_guard_business_admin_fields
  BEFORE INSERT OR UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_business_admin_fields();

-- The admin dashboard updates moderation fields through the authenticated
-- Supabase client, so give admins an explicit row-level policy for that path.
DROP POLICY IF EXISTS businesses_admin_update ON public.businesses;
CREATE POLICY businesses_admin_update
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Mark only the trusted review aggregate path as allowed to write the rating.
CREATE OR REPLACE FUNCTION public.update_business_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_previous_flag TEXT := pg_catalog.current_setting('app.caramelinho_rating_recalc', true);
BEGIN
  PERFORM pg_catalog.set_config('app.caramelinho_rating_recalc', 'on', true);

  UPDATE public.businesses AS business
  SET average_rating = (
    SELECT COALESCE(AVG(review.rating), 0)
    FROM public.reviews AS review
    WHERE review.business_id = business.id
  )
  WHERE business.id = NEW.business_id OR business.id = OLD.business_id;

  PERFORM pg_catalog.set_config('app.caramelinho_rating_recalc', COALESCE(v_previous_flag, ''), true);
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM pg_catalog.set_config('app.caramelinho_rating_recalc', COALESCE(v_previous_flag, ''), true);
    RAISE;
END;
$function$;
