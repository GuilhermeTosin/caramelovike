BEGIN;

-- URL tombstones intentionally have no FK to businesses, so deleting a
-- business cannot erase or transfer its previously public URLs.
CREATE TABLE IF NOT EXISTS public.business_url_tombstones (
  route_path TEXT PRIMARY KEY,
  reserved_slug TEXT NOT NULL,
  url_kind TEXT NOT NULL CHECK (url_kind IN ('canonical', 'short')),
  retired_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_url_tombstones_reserved_slug
  ON public.business_url_tombstones (reserved_slug);

ALTER TABLE public.business_url_tombstones ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.business_url_tombstones FROM PUBLIC, anon, authenticated;
GRANT SELECT (route_path, reserved_slug)
  ON TABLE public.business_url_tombstones TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can check retired business URLs" ON public.business_url_tombstones;
CREATE POLICY "Anyone can check retired business URLs"
  ON public.business_url_tombstones
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Keep previous /go aliases redirecting while their business is active.
CREATE TABLE IF NOT EXISTS public.business_short_link_history (
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  old_short_slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (business_id, old_short_slug)
);

CREATE INDEX IF NOT EXISTS idx_business_short_link_history_business_id
  ON public.business_short_link_history (business_id);

ALTER TABLE public.business_short_link_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.business_short_link_history FROM PUBLIC, anon, authenticated;
GRANT SELECT (business_id, old_short_slug)
  ON TABLE public.business_short_link_history TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view business short-link history" ON public.business_short_link_history;
CREATE POLICY "Anyone can view business short-link history"
  ON public.business_short_link_history
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.capture_business_short_link_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF lower(trim(OLD.short_slug)) IS DISTINCT FROM lower(trim(NEW.short_slug)) THEN
    INSERT INTO public.business_short_link_history (business_id, old_short_slug)
    VALUES (NEW.business_id, lower(trim(OLD.short_slug)))
    ON CONFLICT (old_short_slug)
    DO UPDATE SET business_id = EXCLUDED.business_id
    WHERE public.business_short_link_history.business_id = EXCLUDED.business_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_business_short_slug_reuse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_slug TEXT := lower(trim(COALESCE(NEW.short_slug, '')));
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.business_short_link_history history
    WHERE history.old_short_slug = normalized_slug
      AND history.business_id <> NEW.business_id
  ) OR EXISTS (
    SELECT 1
    FROM public.business_url_tombstones tombstone
    WHERE tombstone.reserved_slug = normalized_slug
  ) THEN
    RAISE EXCEPTION 'Business short slug is reserved by a historical URL';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS capture_business_short_link_history ON public.business_short_links;
CREATE TRIGGER capture_business_short_link_history
  AFTER UPDATE OF short_slug
  ON public.business_short_links
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_business_short_link_history();

DROP TRIGGER IF EXISTS prevent_business_short_slug_reuse ON public.business_short_links;
CREATE TRIGGER prevent_business_short_slug_reuse
  BEFORE INSERT OR UPDATE OF short_slug
  ON public.business_short_links
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_business_short_slug_reuse();

CREATE OR REPLACE FUNCTION public.prevent_historical_business_slug_reuse()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  normalized_slug TEXT := lower(trim(COALESCE(NEW.slug, '')));
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.business_slug_history history
    WHERE history.old_business_slug = normalized_slug
      AND history.business_id <> NEW.id
  ) OR EXISTS (
    SELECT 1
    FROM public.business_url_tombstones tombstone
    WHERE tombstone.reserved_slug = normalized_slug
  ) THEN
    RAISE EXCEPTION 'Business slug is reserved by a historical URL';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_deleted_business_urls()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Retire canonical URLs from every prior name/location, preserving exact paths.
  INSERT INTO public.business_url_tombstones (route_path, reserved_slug, url_kind)
  SELECT
    '/' || lower(trim(history.country_slug)) || '/' || lower(trim(history.region_slug)) || '/' ||
      lower(trim(history.city_slug)) || '/' || lower(trim(history.old_business_slug)),
    lower(trim(history.old_business_slug)),
    'canonical'
  FROM public.business_slug_history history
  WHERE history.business_id = OLD.id
    AND trim(history.old_business_slug) <> ''
  ON CONFLICT (route_path) DO NOTHING;

  -- Also reserve the final canonical URL, which is not itself a history row.
  INSERT INTO public.business_url_tombstones (route_path, reserved_slug, url_kind)
  SELECT
    public.business_canonical_path(OLD),
    lower(trim(OLD.slug)),
    'canonical'
  WHERE trim(COALESCE(OLD.slug, '')) <> ''
  ON CONFLICT (route_path) DO NOTHING;

  -- Retire every earlier short alias and the currently active /go alias.
  INSERT INTO public.business_url_tombstones (route_path, reserved_slug, url_kind)
  SELECT retired.route_path, retired.reserved_slug, retired.url_kind
  FROM (
    SELECT '/go/' || lower(trim(history.old_short_slug)) AS route_path,
      lower(trim(history.old_short_slug)) AS reserved_slug,
      'short'::TEXT AS url_kind
    FROM public.business_short_link_history history
    WHERE history.business_id = OLD.id
      AND trim(history.old_short_slug) <> ''
    UNION
    SELECT '/go/' || lower(trim(link.short_slug)) AS route_path,
      lower(trim(link.short_slug)) AS reserved_slug,
      'short'::TEXT AS url_kind
    FROM public.business_short_links link
    WHERE link.business_id = OLD.id
      AND trim(link.short_slug) <> ''
  ) AS retired
  ON CONFLICT (route_path) DO NOTHING;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS reserve_deleted_business_urls ON public.businesses;
CREATE TRIGGER reserve_deleted_business_urls
  BEFORE DELETE
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_deleted_business_urls();

NOTIFY pgrst, 'reload schema';

COMMIT;
