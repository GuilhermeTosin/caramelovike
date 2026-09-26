alter table public.marketplace_listings
  add column if not exists show_on_business_page boolean not null default false;

alter table public.marketplace_listings
  drop constraint if exists marketplace_listings_business_page_requires_business;

alter table public.marketplace_listings
  add constraint marketplace_listings_business_page_requires_business
  check (not show_on_business_page or seller_business_id is not null);

create index if not exists marketplace_listings_business_page_idx
  on public.marketplace_listings (seller_business_id, created_at desc, id desc)
  where status = 'active' and show_on_business_page = true;

create or replace function public.validate_marketplace_seller_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.show_on_business_page and new.seller_business_id is null then
    raise exception 'Associe o anuncio a um negocio antes de exibi-lo na pagina do negocio.'
      using errcode = 'check_violation';
  end if;

  if new.seller_business_id is not null
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.can_publish_marketplace_as_business(new.seller_business_id, auth.uid()) then
    raise exception 'Voce nao pode publicar ou exibir anuncios em nome deste negocio.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_marketplace_seller_business on public.marketplace_listings;
create trigger validate_marketplace_seller_business
before insert or update of seller_business_id, show_on_business_page, owner_id
on public.marketplace_listings
for each row execute function public.validate_marketplace_seller_business();

-- Preserve the existing RPC signature for old clients and add an explicit
-- opt-in parameter for bundles that support business-page placement.
create or replace function public.create_marketplace_listing_with_images(
  p_listing_id uuid,
  p_seller_business_id uuid,
  p_listing_type text,
  p_category_id uuid,
  p_title text,
  p_description text,
  p_price numeric,
  p_currency text,
  p_condition text,
  p_country_code text,
  p_state_code text,
  p_city text,
  p_neighborhood text,
  p_lat double precision,
  p_lng double precision,
  p_show_on_business_page boolean,
  p_keywords text[] default '{}'::text[],
  p_video_url text default null,
  p_slug text default null,
  p_images text[] default '{}'::text[]
)
returns setof public.marketplace_listings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_listing public.marketplace_listings;
begin
  if auth.uid() is null then
    raise exception 'Faca login para publicar um anuncio.' using errcode = 'insufficient_privilege';
  end if;

  if p_show_on_business_page and p_seller_business_id is null then
    raise exception 'Associe o anuncio a um negocio antes de exibi-lo na pagina do negocio.'
      using errcode = 'check_violation';
  end if;

  select listing.* into v_listing
  from public.create_marketplace_listing_with_images(
    p_listing_id,
    p_seller_business_id,
    p_listing_type,
    p_category_id,
    p_title,
    p_description,
    p_price,
    p_currency,
    p_condition,
    p_country_code,
    p_state_code,
    p_city,
    p_neighborhood,
    p_lat,
    p_lng,
    p_keywords,
    p_video_url,
    p_slug,
    p_images
  ) as listing
  limit 1;

  if not found then
    raise exception 'Nao foi possivel criar o anuncio.';
  end if;

  update public.marketplace_listings
  set show_on_business_page = p_show_on_business_page
  where id = v_listing.id
    and owner_id = auth.uid()
  returning * into v_listing;

  if not found then
    raise exception 'Voce nao pode atualizar este anuncio.' using errcode = 'insufficient_privilege';
  end if;

  return next v_listing;
end;
$$;

revoke execute on function public.create_marketplace_listing_with_images(
  uuid, uuid, text, uuid, text, text, numeric, text, text, text, text, text, text,
  double precision, double precision, boolean, text[], text, text, text[]
) from public;

grant execute on function public.create_marketplace_listing_with_images(
  uuid, uuid, text, uuid, text, text, numeric, text, text, text, text, text, text,
  double precision, double precision, boolean, text[], text, text, text[]
) to authenticated;
