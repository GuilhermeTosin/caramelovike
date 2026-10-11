create or replace function public.replace_marketplace_listing_images(
  p_listing_id uuid,
  p_image_urls text[]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_image_urls text[] := coalesce(p_image_urls, '{}'::text[]);
begin
  if not exists (
    select 1
    from public.marketplace_listings
    where id = p_listing_id
      and owner_id = auth.uid()
  ) then
    raise exception 'Acesso nao autorizado para editar as fotos deste anuncio';
  end if;

  if coalesce(array_length(v_image_urls, 1), 0) > 8 then
    raise exception 'Um anuncio pode ter no maximo oito fotos';
  end if;

  if exists (
    select 1
    from unnest(v_image_urls) as image_rows(image_url)
    where trim(image_rows.image_url) = ''
  ) then
    raise exception 'As URLs das fotos nao podem estar vazias';
  end if;

  delete from public.marketplace_listing_images
  where listing_id = p_listing_id;

  insert into public.marketplace_listing_images (listing_id, image_url, sort_order)
  select p_listing_id, image_url, (ordinality - 1)::integer
  from unnest(v_image_urls) with ordinality as image_rows(image_url, ordinality);
end;
$$;

revoke execute on function public.replace_marketplace_listing_images(uuid, text[]) from public;
grant execute on function public.replace_marketplace_listing_images(uuid, text[]) to authenticated;
