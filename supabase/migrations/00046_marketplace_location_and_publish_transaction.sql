-- Normaliza cidades no banco para que Montreal e Montréal sejam a mesma
-- localidade de busca, sem carregar uma lista global para a aplicação.
create schema if not exists extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_marketplace_city(value text)
returns text
language sql
immutable
parallel safe
set search_path = public, extensions
as $$
  select lower(trim(unaccent(split_part(coalesce(value, ''), ',', 1))));
$$;

alter table public.marketplace_listings
  add column if not exists city_normalized text not null default '';

update public.marketplace_listings
set city_normalized = public.normalize_marketplace_city(city)
where city_normalized is distinct from public.normalize_marketplace_city(city);

create or replace function public.normalize_marketplace_listing_location()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.country_code := lower(trim(new.country_code));
  new.state_code := lower(trim(new.state_code));
  new.city := trim(new.city);
  new.city_normalized := public.normalize_marketplace_city(new.city);
  return new;
end;
$$;

drop trigger if exists trg_normalize_marketplace_listing_location on public.marketplace_listings;
create trigger trg_normalize_marketplace_listing_location
before insert or update on public.marketplace_listings
for each row execute function public.normalize_marketplace_listing_location();

drop index if exists public.marketplace_listings_location_idx;
create index if not exists marketplace_listings_location_normalized_idx
  on public.marketplace_listings
  (city_normalized, country_code, state_code, status, created_at desc, id desc);

-- Cria o anúncio e suas referências de imagens na mesma transação do banco.
-- p_listing_id também funciona como chave idempotente para uma repetição da
-- mesma publicação após uma resposta de rede perdida.
create or replace function public.create_marketplace_listing_with_images(
  p_listing_id uuid,
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

  select * into existing_listing
  from public.marketplace_listings
  where id = p_listing_id;

  if found then
    if existing_listing.owner_id <> auth.uid() then
      raise exception 'Este anúncio pertence a outro usuário.' using errcode = 'insufficient_privilege';
    end if;
    return next existing_listing;
    return;
  end if;

  insert into public.marketplace_listings (
    id,
    owner_id,
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

revoke execute on function public.create_marketplace_listing_with_images(uuid, text, uuid, text, text, numeric, text, text, text, text, text, text, double precision, double precision, text[], text, text, text[]) from public;
grant execute on function public.create_marketplace_listing_with_images(uuid, text, uuid, text, text, numeric, text, text, text, text, text, text, double precision, double precision, text[], text, text, text[]) to authenticated;
