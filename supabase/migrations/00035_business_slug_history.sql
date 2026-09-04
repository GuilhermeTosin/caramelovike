-- Permanent redirects for previous business slugs and location paths.
CREATE TABLE IF NOT EXISTS public.business_slug_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  country_slug TEXT NOT NULL,
  region_slug TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  old_business_slug TEXT NOT NULL,
  new_canonical_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_slug, region_slug, city_slug, old_business_slug)
);

CREATE INDEX IF NOT EXISTS idx_business_slug_history_business_id
  ON public.business_slug_history (business_id);

ALTER TABLE public.business_slug_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.business_slug_history TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view business slug history" ON public.business_slug_history;
CREATE POLICY "Anyone can view business slug history"
  ON public.business_slug_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.business_canonical_path(business_row public.businesses)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  country_slug TEXT := lower(trim(COALESCE(business_row.country_code, '')));
  region_slug TEXT := lower(trim(COALESCE(business_row.state_code, '')));
  current_city_slug TEXT := lower(trim(COALESCE(NULLIF(business_row.city_slug, ''), business_row.city, '')));
  business_slug TEXT := lower(trim(COALESCE(business_row.slug, '')));
BEGIN
  IF country_slug = '' OR business_slug = '' THEN
    RETURN '/go/' || business_slug;
  END IF;

  IF region_slug <> '' AND current_city_slug <> '' THEN
    RETURN '/' || country_slug || '/' || region_slug || '/' || current_city_slug || '/' || business_slug;
  END IF;

  RETURN '/' || country_slug || '/' || business_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_historical_business_slug_reuse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.business_slug_history history
    WHERE history.old_business_slug = lower(trim(COALESCE(NEW.slug, '')))
      AND history.business_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Business slug is reserved by a historical URL';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_historical_business_slug_reuse ON public.businesses;
CREATE TRIGGER prevent_historical_business_slug_reuse
  BEFORE INSERT OR UPDATE OF slug
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_historical_business_slug_reuse();
CREATE OR REPLACE FUNCTION public.capture_business_slug_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_country_slug TEXT := lower(trim(COALESCE(OLD.country_code, '')));
  old_region_slug TEXT := lower(trim(COALESCE(OLD.state_code, '')));
  old_city_slug TEXT := lower(trim(COALESCE(NULLIF(OLD.city_slug, ''), OLD.city, '')));
  old_business_slug TEXT := lower(trim(COALESCE(OLD.slug, '')));
  old_path TEXT := public.business_canonical_path(OLD);
  new_path TEXT := public.business_canonical_path(NEW);
BEGIN
  UPDATE public.business_slug_history
  SET new_canonical_path = new_path
  WHERE business_id = NEW.id;

  IF old_path IS DISTINCT FROM new_path
    AND old_country_slug <> ''
    AND old_region_slug <> ''
    AND old_city_slug <> ''
    AND old_business_slug <> '' THEN
    INSERT INTO public.business_slug_history (
      business_id,
      country_slug,
      region_slug,
      city_slug,
      old_business_slug,
      new_canonical_path
    ) VALUES (
      NEW.id,
      old_country_slug,
      old_region_slug,
      old_city_slug,
      old_business_slug,
      new_path
    )
    ON CONFLICT (country_slug, region_slug, city_slug, old_business_slug)
    DO UPDATE SET
      business_id = EXCLUDED.business_id,
      new_canonical_path = EXCLUDED.new_canonical_path;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_business_slug_or_location_changed ON public.businesses;
CREATE TRIGGER on_business_slug_or_location_changed
  AFTER UPDATE OF slug, country_code, state_code, city, city_slug
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_business_slug_history();

-- Redirects discovered in Search Console before history tracking existed.
INSERT INTO public.business_slug_history (
  business_id,
  country_slug,
  region_slug,
  city_slug,
  old_business_slug,
  new_canonical_path
)
SELECT id, 'ca', 'qc', 'montreal', 'tapi-go-montreal', '/ca/qc/montreal/tapi-go'
FROM public.businesses
WHERE lower(country_code) = 'ca'
  AND lower(state_code) = 'qc'
  AND lower(slug) = 'tapi-go'
ON CONFLICT (country_slug, region_slug, city_slug, old_business_slug)
DO UPDATE SET
  business_id = EXCLUDED.business_id,
  new_canonical_path = EXCLUDED.new_canonical_path;

INSERT INTO public.business_slug_history (
  business_id,
  country_slug,
  region_slug,
  city_slug,
  old_business_slug,
  new_canonical_path
)
SELECT id, 'ca', 'qc', 'mirabel', 'chez-luma-hotel-para-caes', '/ca/qc/mirabel/chez-luma'
FROM public.businesses
WHERE lower(country_code) = 'ca'
  AND lower(state_code) = 'qc'
  AND lower(slug) = 'chez-luma'
ON CONFLICT (country_slug, region_slug, city_slug, old_business_slug)
DO UPDATE SET
  business_id = EXCLUDED.business_id,
  new_canonical_path = EXCLUDED.new_canonical_path;