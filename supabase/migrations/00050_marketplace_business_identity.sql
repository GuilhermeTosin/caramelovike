-- Permite publicar um anúncio em nome do próprio negócio sem trocar a
-- propriedade técnica do anúncio: owner_id continua sendo o usuário logado.
alter table public.marketplace_listings
  add column if not exists seller_business_id uuid
    references public.businesses(id) on delete set null;

create index if not exists marketplace_listings_seller_business_idx
  on public.marketplace_listings (seller_business_id, status, created_at desc, id desc);

create or replace function public.can_publish_marketplace_as_business(
  p_business_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_business_id is null
    or exists (
      select 1
      from public.businesses as business
      where business.id = p_business_id
        and (
          business.owner_id = p_user_id
          or public.is_admin(p_user_id)
          or exists (
            select 1
            from public.business_managers as manager
            where manager.business_id = business.id
              and manager.user_id = p_user_id
          )
        )
    );
$$;

create or replace function public.get_marketplace_seller_businesses()
returns table (id uuid, name text, logo_url text)
language sql
stable
security definer
set search_path = public
as $$
  select business.id, business.name, business.logo_url
  from public.businesses as business
  where business.owner_id = auth.uid()
     or public.is_admin(auth.uid())
     or exists (
       select 1
       from public.business_managers as manager
       where manager.business_id = business.id
         and manager.user_id = auth.uid()
     )
  order by business.name;
$$;

revoke execute on function public.can_publish_marketplace_as_business(uuid, uuid) from public;
grant execute on function public.can_publish_marketplace_as_business(uuid, uuid) to authenticated;
revoke execute on function public.get_marketplace_seller_businesses() from public;
grant execute on function public.get_marketplace_seller_businesses() to authenticated;

create or replace function public.validate_marketplace_seller_business()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.seller_business_id is not null
     and coalesce(auth.role(), '') <> 'service_role'
     and not public.can_publish_marketplace_as_business(new.seller_business_id, auth.uid()) then
    raise exception 'Você não pode publicar em nome deste negócio.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_marketplace_seller_business on public.marketplace_listings;
create trigger validate_marketplace_seller_business
before insert or update of seller_business_id, owner_id on public.marketplace_listings
for each row execute function public.validate_marketplace_seller_business();

-- Nova assinatura usada pelo frontend. A assinatura anterior é mantida para
-- que bundles antigos continuem publicando anúncios pessoais durante o deploy.
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
  existing_listing public.marketplace_listings;
  created_listing public.marketplace_listings;
begin
  if auth.uid() is null then
    raise exception 'Faça login para publicar um anúncio.' using errcode = 'insufficient_privilege';
  end if;

  if p_seller_business_id is not null
     and not public.can_publish_marketplace_as_business(p_seller_business_id, auth.uid()) then
    raise exception 'Você não pode publicar em nome deste negócio.' using errcode = 'insufficient_privilege';
  end if;

  select * into existing_listing
  from public.marketplace_listings
  where id = p_listing_id;

  if found then
    if existing_listing.owner_id <> auth.uid() then
      raise exception 'Este anúncio pertence a outro usuário.' using errcode = 'insufficient_privilege';
    end if;
    if existing_listing.seller_business_id is distinct from p_seller_business_id then
      raise exception 'A publicação já existe com outra identidade de anunciante.' using errcode = 'unique_violation';
    end if;
    return next existing_listing;
    return;
  end if;

  insert into public.marketplace_listings (
    id,
    owner_id,
    seller_business_id,
    listing_type,
    category_id,
    title,
    description,
    price,
    currency,
    condition,
    country_code,
    state_code,
    city,
    neighborhood,
    lat,
    lng,
    keywords,
    video_url,
    slug,
    status
  ) values (
    p_listing_id,
    auth.uid(),
    p_seller_business_id,
    p_listing_type,
    p_category_id,
    trim(p_title),
    trim(p_description),
    p_price,
    upper(trim(p_currency)),
    p_condition,
    p_country_code,
    p_state_code,
    p_city,
    nullif(trim(p_neighborhood), ''),
    p_lat,
    p_lng,
    coalesce(p_keywords, '{}'::text[]),
    nullif(trim(p_video_url), ''),
    coalesce(nullif(trim(p_slug), ''), 'anuncio-' || replace(p_listing_id::text, '-', '')),
    'active'
  ) returning * into created_listing;

  insert into public.marketplace_listing_images (listing_id, image_url, sort_order)
  select created_listing.id, image_url, ordinal - 1
  from unnest(coalesce(p_images[1:8], '{}'::text[])) with ordinality as image_rows(image_url, ordinal)
  where nullif(trim(image_url), '') is not null;

  return next created_listing;
end;
$$;

revoke execute on function public.create_marketplace_listing_with_images(uuid, uuid, text, uuid, text, text, numeric, text, text, text, text, text, text, double precision, double precision, text[], text, text, text[]) from public;
grant execute on function public.create_marketplace_listing_with_images(uuid, uuid, text, uuid, text, text, numeric, text, text, text, text, text, text, double precision, double precision, text[], text, text, text[]) to authenticated;
