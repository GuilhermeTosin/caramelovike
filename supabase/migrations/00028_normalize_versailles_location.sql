-- Normalize the Portuguese display label without changing the route yet.
-- Migration 00029 records the existing slug as an alias before switching canonical slugs.
UPDATE public.business_locations
SET display_name_pt_br = 'Versalhes'
WHERE lower(COALESCE(country_code, '')) = 'fr'
  AND lower(COALESCE(state_code, '')) = 'idf'
  AND lower(unaccent(COALESCE(NULLIF(display_name_pt_br, ''), official_name))) IN ('versailles', 'versalhes');

UPDATE public.businesses
SET city = 'Versalhes'
WHERE lower(COALESCE(country_code, '')) = 'fr'
  AND lower(COALESCE(state_code, '')) = 'idf'
  AND lower(unaccent(COALESCE(city, ''))) IN ('versailles', 'versalhes');
