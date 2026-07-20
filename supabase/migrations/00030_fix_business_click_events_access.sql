-- Keep optional business click tracking available to the public client.
ALTER TABLE public.business_click_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert business click events"
  ON public.business_click_events;

CREATE POLICY "Anyone can insert business click events"
  ON public.business_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON TABLE public.business_click_events TO anon, authenticated;
