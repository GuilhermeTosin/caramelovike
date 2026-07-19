-- Canonical Portuguese location slugs with permanent aliases for legacy URLs.
CREATE TABLE IF NOT EXISTS public.business_location_slug_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.business_locations(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL,
  state_code TEXT NOT NULL DEFAULT '',
  city_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, state_code, city_slug)
);

CREATE INDEX IF NOT EXISTS idx_business_location_slug_aliases_location_id
  ON public.business_location_slug_aliases (location_id);

ALTER TABLE public.business_location_slug_aliases ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON TABLE public.business_location_slug_aliases TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view business location slug aliases" ON public.business_location_slug_aliases;
CREATE POLICY "Anyone can view business location slug aliases"
  ON public.business_location_slug_aliases
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Preserve every current location path before replacing known English/local variants.
INSERT INTO public.business_location_slug_aliases (location_id, country_code, state_code, city_slug)
SELECT id, lower(country_code), lower(state_code), lower(city_slug)
FROM public.business_locations
WHERE COALESCE(city_slug, '') <> ''
ON CONFLICT (country_code, state_code, city_slug)
DO UPDATE SET location_id = EXCLUDED.location_id;

DO $$
DECLARE
  mapping RECORD;
  state_group RECORD;
  primary_location public.business_locations;
BEGIN
  FOR mapping IN
    SELECT *
    FROM (
      VALUES
        ('at', ARRAY['vienna', 'wien', 'viena'], 'Viena', 'viena'),
        ('be', ARRAY['antwerp', 'antwerpen', 'antuerpia'], U&'Antu\00E9rpia', 'antuerpia'),
        ('be', ARRAY['brussels', 'bruxelles', 'bruxelas'], 'Bruxelas', 'bruxelas'),
        ('ch', ARRAY['geneva', 'geneve', 'genf', 'genebra'], 'Genebra', 'genebra'),
        ('ch', ARRAY['zurich', 'zurique'], 'Zurique', 'zurique'),
        ('cn', ARRAY['beijing', 'pequim'], 'Pequim', 'pequim'),
        ('cz', ARRAY['prague', 'praha', 'praga'], 'Praga', 'praga'),
        ('de', ARRAY['berlin', 'berlim'], 'Berlim', 'berlim'),
        ('de', ARRAY['cologne', 'koln', 'colonia'], U&'Col\00F4nia', 'colonia'),
        ('de', ARRAY['munich', 'munchen', 'munique'], 'Munique', 'munique'),
        ('de', ARRAY['nuremberg', 'nurnberg', 'nurembergue'], 'Nurembergue', 'nurembergue'),
        ('dk', ARRAY['copenhagen', 'kobenhavn', 'copenhague'], 'Copenhague', 'copenhague'),
        ('es', ARRAY['seville', 'sevilla', 'sevilha'], 'Sevilha', 'sevilha'),
        ('fi', ARRAY['helsinki', 'helsinque'], 'Helsinque', 'helsinque'),
        ('fr', ARRAY['marseille', 'marseilles', 'marselha'], 'Marselha', 'marselha'),
        ('fr', ARRAY['versailles', 'versalhes'], 'Versalhes', 'versalhes'),
        ('gb', ARRAY['london', 'londres'], 'Londres', 'londres'),
        ('gr', ARRAY['athens', 'athina', 'atenas'], 'Atenas', 'atenas'),
        ('hu', ARRAY['budapest', 'budapeste'], 'Budapeste', 'budapeste'),
        ('ie', ARRAY['dublin', 'dublim'], 'Dublim', 'dublim'),
        ('it', ARRAY['florence', 'firenze', 'florenca'], U&'Floren\00E7a', 'florenca'),
        ('it', ARRAY['milan', 'milano', 'milao'], U&'Mil\00E3o', 'milao'),
        ('it', ARRAY['rome', 'roma'], 'Roma', 'roma'),
        ('it', ARRAY['turin', 'torino', 'turim'], 'Turim', 'turim'),
        ('it', ARRAY['venice', 'venezia', 'veneza'], 'Veneza', 'veneza'),
        ('jp', ARRAY['kyoto', 'quioto'], 'Quioto', 'quioto'),
        ('jp', ARRAY['tokyo', 'tokyo to', 'toquio'], U&'T\00F3quio', 'toquio'),
        ('kr', ARRAY['seoul', 'seul'], 'Seul', 'seul'),
        ('nl', ARRAY['the hague', 'den haag', 'haia'], 'Haia', 'haia'),
        ('pl', ARRAY['warsaw', 'warszawa', 'varsovia'], U&'Vars\00F3via', 'varsovia'),
        ('ro', ARRAY['bucharest', 'bucuresti', 'bucareste'], 'Bucareste', 'bucareste'),
        ('ru', ARRAY['moscow', 'moskva', 'moscou'], 'Moscou', 'moscou'),
        ('se', ARRAY['stockholm', 'estocolmo'], 'Estocolmo', 'estocolmo'),
        ('tr', ARRAY['istanbul', 'istambul'], 'Istambul', 'istambul'),
        ('us', ARRAY['new york', 'new york city', 'nova york'], 'Nova York', 'nova-york')
    ) AS locations(country_code, source_names, display_name_pt_br, canonical_slug)
  LOOP
    FOR state_group IN
      SELECT DISTINCT lower(l.state_code) AS state_code
      FROM public.business_locations l
      WHERE lower(l.country_code) = mapping.country_code
        AND (
          lower(unaccent(COALESCE(NULLIF(l.display_name_pt_br, ''), l.official_name))) = ANY (mapping.source_names)
          OR lower(l.city_slug) = mapping.canonical_slug
        )
    LOOP
      primary_location := NULL;

      SELECT l.* INTO primary_location
      FROM public.business_locations l
      WHERE lower(l.country_code) = mapping.country_code
        AND lower(l.state_code) = state_group.state_code
        AND (
          lower(unaccent(COALESCE(NULLIF(l.display_name_pt_br, ''), l.official_name))) = ANY (mapping.source_names)
          OR lower(l.city_slug) = mapping.canonical_slug
        )
      ORDER BY CASE WHEN lower(l.city_slug) = mapping.canonical_slug THEN 0 ELSE 1 END, l.created_at ASC
      LIMIT 1;

      IF primary_location.id IS NULL THEN
        CONTINUE;
      END IF;

      INSERT INTO public.business_location_slug_aliases (location_id, country_code, state_code, city_slug)
      SELECT primary_location.id, lower(l.country_code), lower(l.state_code), lower(l.city_slug)
      FROM public.business_locations l
      WHERE lower(l.country_code) = mapping.country_code
        AND lower(l.state_code) = state_group.state_code
        AND COALESCE(l.city_slug, '') <> ''
        AND (
          lower(unaccent(COALESCE(NULLIF(l.display_name_pt_br, ''), l.official_name))) = ANY (mapping.source_names)
          OR lower(l.city_slug) = mapping.canonical_slug
        )
      ON CONFLICT (country_code, state_code, city_slug)
      DO UPDATE SET location_id = EXCLUDED.location_id;

      UPDATE public.business_location_slug_aliases a
      SET location_id = primary_location.id
      WHERE a.location_id IN (
        SELECT l.id
        FROM public.business_locations l
        WHERE lower(l.country_code) = mapping.country_code
          AND lower(l.state_code) = state_group.state_code
          AND (
            lower(unaccent(COALESCE(NULLIF(l.display_name_pt_br, ''), l.official_name))) = ANY (mapping.source_names)
            OR lower(l.city_slug) = mapping.canonical_slug
          )
      );

      UPDATE public.businesses b
      SET location_id = primary_location.id,
          city = mapping.display_name_pt_br,
          city_slug = mapping.canonical_slug
      WHERE b.location_id IN (
        SELECT l.id
        FROM public.business_locations l
        WHERE lower(l.country_code) = mapping.country_code
          AND lower(l.state_code) = state_group.state_code
          AND (
            lower(unaccent(COALESCE(NULLIF(l.display_name_pt_br, ''), l.official_name))) = ANY (mapping.source_names)
            OR lower(l.city_slug) = mapping.canonical_slug
          )
      )
      OR (
        lower(COALESCE(b.country_code, '')) = mapping.country_code
        AND lower(COALESCE(b.state_code, '')) = state_group.state_code
        AND lower(unaccent(COALESCE(b.city, ''))) = ANY (mapping.source_names)
      );

      DELETE FROM public.business_locations l
      WHERE l.id <> primary_location.id
        AND lower(l.country_code) = mapping.country_code
        AND lower(l.state_code) = state_group.state_code
        AND (
          lower(unaccent(COALESCE(NULLIF(l.display_name_pt_br, ''), l.official_name))) = ANY (mapping.source_names)
          OR lower(l.city_slug) = mapping.canonical_slug
        );

      UPDATE public.business_locations
      SET display_name_pt_br = mapping.display_name_pt_br,
          city_slug = mapping.canonical_slug
      WHERE id = primary_location.id;

      INSERT INTO public.business_location_slug_aliases (location_id, country_code, state_code, city_slug)
      VALUES (primary_location.id, lower(primary_location.country_code), lower(primary_location.state_code), mapping.canonical_slug)
      ON CONFLICT (country_code, state_code, city_slug)
      DO UPDATE SET location_id = EXCLUDED.location_id;
    END LOOP;
  END LOOP;
END;
$$;

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
  ELSE
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
  END IF;

  INSERT INTO public.business_location_slug_aliases (location_id, country_code, state_code, city_slug)
  VALUES (v_location.id, v_country_code, v_state_code, v_location.city_slug)
  ON CONFLICT (country_code, state_code, city_slug)
  DO UPDATE SET location_id = EXCLUDED.location_id;

  INSERT INTO public.business_location_slug_aliases (location_id, country_code, state_code, city_slug)
  VALUES (v_location.id, v_country_code, v_state_code, v_city_slug)
  ON CONFLICT (country_code, state_code, city_slug)
  DO UPDATE SET location_id = EXCLUDED.location_id;

  RETURN v_location;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_business_location(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;
