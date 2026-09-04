-- Keep the verified badge tied to real verification requests only.
-- Ownership transfer should never grant the verified badge by itself.

UPDATE public.businesses b
SET owner_verified = TRUE,
    owner_verified_until = COALESCE(
      b.owner_verified_until,
      (
        SELECT COALESCE(v.reviewed_at, NOW()) + INTERVAL '12 months'
        FROM public.business_verification_requests v
        WHERE v.business_id = b.id
          AND v.status = 'approved'
        ORDER BY v.reviewed_at DESC NULLS LAST, v.created_at DESC
        LIMIT 1
      )
    )
WHERE EXISTS (
  SELECT 1
  FROM public.business_verification_requests v
  WHERE v.business_id = b.id
    AND v.status = 'approved'
)
AND (b.owner_verified IS DISTINCT FROM TRUE OR b.owner_verified_until IS NULL);

UPDATE public.businesses b
SET owner_verified = FALSE,
    owner_verified_until = NULL
WHERE b.owner_verified = TRUE
  AND b.owner_verified_until IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.business_verification_requests v
    WHERE v.business_id = b.id
      AND v.status = 'approved'
  );

CREATE OR REPLACE FUNCTION public.approve_business_ownership_request(
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_business_id UUID;
  v_requested_by UUID;
BEGIN
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Apenas admins podem aprovar ownership.';
  END IF;

  SELECT business_id, requested_by
    INTO v_business_id, v_requested_by
  FROM public.owner_claim_requests
  WHERE id = p_request_id
    AND status = 'pending'
  FOR UPDATE;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Solicitação pendente não encontrada.';
  END IF;

  UPDATE public.businesses
    SET owner_id = v_requested_by
  WHERE id = v_business_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT id, v_requested_by
  FROM public.conversations
  WHERE business_id = v_business_id
  ON CONFLICT DO NOTHING;

  UPDATE public.owner_claim_requests
    SET status = 'approved',
        reviewed_by = v_admin_id,
        reviewed_at = NOW()
  WHERE id = p_request_id;

  UPDATE public.owner_claim_requests
    SET status = 'rejected',
        reviewed_by = v_admin_id,
        reviewed_at = NOW()
  WHERE business_id = v_business_id
    AND id <> p_request_id
    AND status = 'pending';

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_business_ownership_by_email(
  p_business_id UUID,
  p_new_owner_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_new_owner_id UUID;
BEGIN
  IF NOT public.is_admin(v_admin_id) THEN
    RAISE EXCEPTION 'Apenas admins podem transferir ownership.';
  END IF;

  SELECT id
    INTO v_new_owner_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_new_owner_email))
  LIMIT 1;

  IF v_new_owner_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado com este email.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE id = p_business_id) THEN
    RAISE EXCEPTION 'Negócio não encontrado.';
  END IF;

  UPDATE public.businesses
    SET owner_id = v_new_owner_id
  WHERE id = p_business_id;

  INSERT INTO public.conversation_participants (conversation_id, user_id)
  SELECT id, v_new_owner_id
  FROM public.conversations
  WHERE business_id = p_business_id
  ON CONFLICT DO NOTHING;

  UPDATE public.owner_claim_requests
    SET status = 'approved',
        reviewed_by = v_admin_id,
        reviewed_at = NOW()
  WHERE business_id = p_business_id
    AND requested_by = v_new_owner_id
    AND status = 'pending';

  UPDATE public.owner_claim_requests
    SET status = 'rejected',
        reviewed_by = v_admin_id,
        reviewed_at = NOW()
  WHERE business_id = p_business_id
    AND requested_by <> v_new_owner_id
    AND status = 'pending';

  RETURN TRUE;
END;
$$;
