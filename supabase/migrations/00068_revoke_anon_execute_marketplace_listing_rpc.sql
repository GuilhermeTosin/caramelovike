begin;

-- This overload creates listings and is intended for authenticated clients only.
-- Revoke the default Supabase anon grant as well as PUBLIC, then retain access
-- for authenticated callers.
revoke execute on function public.create_marketplace_listing_with_images(
  uuid, uuid, text, uuid, text, text, numeric, text, text, text, text, text, text,
  double precision, double precision, boolean, text[], text, text, text[]
) from public, anon;

grant execute on function public.create_marketplace_listing_with_images(
  uuid, uuid, text, uuid, text, text, numeric, text, text, text, text, text, text,
  double precision, double precision, boolean, text[], text, text, text[]
) to authenticated;

notify pgrst, 'reload schema';

commit;
