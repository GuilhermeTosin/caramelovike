-- Stable location identities keep city URLs independent from translated display names.
CREATE TABLE IF NOT EXISTS public.business_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_place_id TEXT UNIQUE,
  country_code TEXT NOT NULL,
  state_code TEXT NOT NULL DEFAULT '',
  official_name TEXT NOT NULL,
  display_name_pt_br TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, state_code, city_slug)
);

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.business_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS city_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_business_locations_city_slug
  ON public.business_locations (country_code, state_code, city_slug);

CREATE INDEX IF NOT EXISTS idx_businesses_location_id
  ON public.businesses (location_id);

-- Preserve every existing city segment before new records start using the location registry.
UPDATE public.businesses
SET city_slug = trim(BOTH '-' FROM regexp_replace(
  regexp_replace(lower(unaccent(COALESCE(city, ''))), '[^a-z0-9]+', '-', 'g'),
  '-+', '-', 'g'
))
WHERE COALESCE(city_slug, '') = ''
  AND COALESCE(city, '') <> '';

INSERT INTO public.business_locations (
  country_code,
  state_code,
  official_name,
  display_name_pt_br,
  city_slug
)
SELECT DISTINCT ON (lower(COALESCE(country_code, '')), lower(COALESCE(state_code, '')), city_slug)
  lower(COALESCE(country_code, '')),
  lower(COALESCE(state_code, '')),
  city,
  city,
  city_slug
FROM public.businesses
WHERE COALESCE(country_code, '') <> ''
  AND COALESCE(city_slug, '') <> ''
ORDER BY lower(COALESCE(country_code, '')), lower(COALESCE(state_code, '')), city_slug, created_at ASC
ON CONFLICT (country_code, state_code, city_slug) DO NOTHING;

UPDATE public.businesses b
SET location_id = l.id
FROM public.business_locations l
WHERE b.location_id IS NULL
  AND lower(COALESCE(b.country_code, '')) = l.country_code
  AND lower(COALESCE(b.state_code, '')) = l.state_code
  AND b.city_slug = l.city_slug;

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view business locations" ON public.business_locations;
CREATE POLICY "Anyone can view business locations"
  ON public.business_locations FOR SELECT
  USING (true);

CREATE OR REPLACE FUNCTION public.upsert_business_location(
  p_city_place_id TEXT,
  p_country_code TEXT,
  p_state_code TEXT,
  p_official_name TEXT,
  p_display_name_pt_br TEXT,
  p_city_slug TEXT
)
RETURNS public.business_locations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location public.business_locations;
  v_country_code TEXT := lower(trim(COALESCE(p_country_code, '')));
  v_state_code TEXT := lower(trim(COALESCE(p_state_code, '')));
  v_city_slug TEXT := trim(COALESCE(p_city_slug, ''));
  v_official_name TEXT := trim(COALESCE(p_official_name, ''));
  v_display_name TEXT := trim(COALESCE(p_display_name_pt_br, ''));
  v_city_place_id TEXT := nullif(trim(COALESCE(p_city_place_id, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_country_code = '' OR v_city_slug = '' OR v_official_name = '' THEN
    RAISE EXCEPTION 'Invalid business location';
  END IF;

  IF v_city_place_id IS NOT NULL THEN
    SELECT * INTO v_location
    FROM public.business_locations
    WHERE city_place_id = v_city_place_id;
  END IF;

  IF v_location.id IS NULL THEN
    SELECT * INTO v_location
    FROM public.business_locations
    WHERE country_code = v_country_code
      AND state_code = v_state_code
      AND city_slug = v_city_slug;
  END IF;

  -- Legacy entries may have a historic slug. Reuse their URL before creating a second row.
  IF v_location.id IS NULL THEN
    SELECT * INTO v_location
    FROM public.business_locations
    WHERE country_code = v_country_code
      AND state_code = v_state_code
      AND (
        lower(official_name) = lower(v_official_name)
        OR lower(display_name_pt_br) = lower(COALESCE(NULLIF(v_display_name, ''), v_official_name))
      )
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  IF v_location.id IS NOT NULL THEN
    UPDATE public.business_locations
    SET city_place_id = COALESCE(city_place_id, v_city_place_id),
        display_name_pt_br = CASE
          WHEN display_name_pt_br = '' THEN COALESCE(NULLIF(v_display_name, ''), v_official_name)
          ELSE display_name_pt_br
        END
    WHERE id = v_location.id
    RETURNING * INTO v_location;
    RETURN v_location;
  END IF;

  INSERT INTO public.business_locations (
    city_place_id,
    country_code,
    state_code,
    official_name,
    display_name_pt_br,
    city_slug
  ) VALUES (
    v_city_place_id,
    v_country_code,
    v_state_code,
    v_official_name,
    COALESCE(NULLIF(v_display_name, ''), v_official_name),
    v_city_slug
  )
  ON CONFLICT (country_code, state_code, city_slug)
  DO UPDATE SET city_place_id = COALESCE(public.business_locations.city_place_id, EXCLUDED.city_place_id)
  RETURNING * INTO v_location;

  RETURN v_location;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_business_location(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
