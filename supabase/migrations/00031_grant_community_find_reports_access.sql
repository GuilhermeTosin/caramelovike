-- RLS policies do not replace table privileges in PostgREST.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON TABLE public.community_find_reports TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.community_find_reports TO authenticated;
