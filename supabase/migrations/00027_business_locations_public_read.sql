-- Repair public access after restores or environments where 00026 was only partially applied.
ALTER TABLE IF EXISTS public.business_locations ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON TABLE public.business_locations TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view business locations" ON public.business_locations;
CREATE POLICY "Anyone can view business locations"
  ON public.business_locations
  FOR SELECT
  TO anon, authenticated
  USING (true);
