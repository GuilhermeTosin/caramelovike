BEGIN;

DO $migration$
DECLARE
  v_business_id CONSTANT uuid := '38e5e404-cb81-4a5e-9af2-54b8b40e7452';
  v_expected_name CONSTANT text := 'Tasca dos Maricas';
  v_current_location_id CONSTANT uuid := '85e72b13-5336-4c04-aaba-7e89f7618e02';
  v_country_code text;
  v_state_code text;
  v_target_location_count integer;
  v_target_location_id uuid;
  v_updated_rows integer;
BEGIN
  SELECT location.country_code, location.state_code
  INTO v_country_code, v_state_code
  FROM public.business_locations AS location
  WHERE location.id = v_current_location_id
    AND lower(trim(location.city_slug)) = 'paco-de-arcos';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expected Paço de Arcos location % was not found', v_current_location_id;
  END IF;

  SELECT
    count(*),
    (array_agg(location.id ORDER BY location.created_at))[1]
  INTO v_target_location_count, v_target_location_id
  FROM public.business_locations AS location
  WHERE lower(trim(location.country_code)) = lower(trim(v_country_code))
    AND lower(trim(location.state_code)) = lower(trim(v_state_code))
    AND lower(trim(location.city_slug)) = 'lisboa'
    AND lower(trim(location.official_name)) = 'lisboa'
    AND lower(trim(location.display_name_pt_br)) = 'lisboa';

  IF v_target_location_count <> 1 THEN
    RAISE EXCEPTION
      'Expected one canonical Lisboa location in the same country/region, found %',
      v_target_location_count;
  END IF;

  UPDATE public.businesses AS business
  SET location_id = v_target_location_id
  WHERE business.id = v_business_id
    AND business.name = v_expected_name
    AND lower(trim(coalesce(business.city, ''))) = 'lisboa'
    AND lower(trim(coalesce(business.city_slug, ''))) = 'lisboa'
    AND business.location_id = v_current_location_id;

  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 AND NOT EXISTS (
    SELECT 1
    FROM public.businesses AS business
    WHERE business.id = v_business_id
      AND business.name = v_expected_name
      AND lower(trim(coalesce(business.city, ''))) = 'lisboa'
      AND lower(trim(coalesce(business.city_slug, ''))) = 'lisboa'
      AND business.location_id = v_target_location_id
  ) THEN
    RAISE EXCEPTION
      'Business % no longer matches the verified Lisbon/Paço de Arcos mismatch',
      v_business_id;
  END IF;
END;
$migration$;

COMMIT;
