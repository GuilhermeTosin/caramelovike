BEGIN;

-- Avoid PL/pgSQL resolving old_business_slug as both a local variable and an
-- inferred ON CONFLICT column when a business name or location is updated.
CREATE OR REPLACE FUNCTION public.capture_business_slug_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_old_country_slug TEXT := lower(trim(COALESCE(OLD.country_code, '')));
  v_old_region_slug TEXT := lower(trim(COALESCE(OLD.state_code, '')));
  v_old_city_slug TEXT := lower(trim(COALESCE(NULLIF(OLD.city_slug, ''), OLD.city, '')));
  v_old_business_slug TEXT := lower(trim(COALESCE(OLD.slug, '')));
  v_old_path TEXT := public.business_canonical_path(OLD);
  v_new_path TEXT := public.business_canonical_path(NEW);
BEGIN
  UPDATE public.business_slug_history AS history
  SET new_canonical_path = v_new_path
  WHERE history.business_id = NEW.id;

  IF v_old_path IS DISTINCT FROM v_new_path
    AND v_old_country_slug <> ''
    AND v_old_region_slug <> ''
    AND v_old_city_slug <> ''
    AND v_old_business_slug <> '' THEN
    INSERT INTO public.business_slug_history (
      business_id,
      country_slug,
      region_slug,
      city_slug,
      old_business_slug,
      new_canonical_path
    ) VALUES (
      NEW.id,
      v_old_country_slug,
      v_old_region_slug,
      v_old_city_slug,
      v_old_business_slug,
      v_new_path
    )
    ON CONFLICT (country_slug, region_slug, city_slug, old_business_slug)
    DO UPDATE SET
      business_id = EXCLUDED.business_id,
      new_canonical_path = EXCLUDED.new_canonical_path;
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
