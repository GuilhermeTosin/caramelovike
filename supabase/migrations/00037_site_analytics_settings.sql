-- Stores only the public GA4 measurement ID. The full pasted snippet is intentionally never executed or persisted.
CREATE TABLE IF NOT EXISTS public.site_analytics_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
  google_analytics_measurement_id TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.site_analytics_settings ENABLE ROW LEVEL SECURITY;

-- No client-side policies: reads and writes go only through the server API.
REVOKE ALL ON TABLE public.site_analytics_settings FROM anon, authenticated;

INSERT INTO public.site_analytics_settings (id, google_analytics_measurement_id)
VALUES (TRUE, '')
ON CONFLICT (id) DO NOTHING;
