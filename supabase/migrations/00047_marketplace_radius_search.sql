-- Server-side radius search for Marketplace pagination.
-- The city selected by the user is used as the origin. When a radius is
-- active, distance is the location filter instead of an exact city match.

-- Older Marketplace rows may have only city/state/country. Reuse a valid
-- coordinate from an existing business in the same locality as a city-level
-- fallback so those rows remain eligible for radius searches.
create or replace function public.fill_marketplace_coordinates_from_city()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  if new.lat is not null and new.lng is not null then
    return new;
  end if;

  select b.lat, b.lng
    into new.lat, new.lng
  from public.businesses b
  where public.normalize_marketplace_city(b.city) = public.normalize_marketplace_city(new.city)
    and lower(trim(coalesce(b.country_code, ''))) = lower(trim(coalesce(new.country_code, '')))
    and lower(trim(coalesce(b.state_code, ''))) = lower(trim(coalesce(new.state_code, '')))
    and b.lat is not null
    and b.lng is not null
    and b.lat <> 0
    and b.lng <> 0
  order by b.created_at desc, b.id desc
  limit 1;

  return new;
end;
$$;

drop trigger if exists trg_fill_marketplace_coordinates on public.marketplace_listings;
create trigger trg_fill_marketplace_coordinates
before insert or update of city, country_code, state_code, lat, lng
on public.marketplace_listings
for each row execute function public.fill_marketplace_coordinates_from_city();

update public.marketplace_listings l
set lat = source.lat,
    lng = source.lng
from lateral (
  select b.lat, b.lng
  from public.businesses b
  where public.normalize_marketplace_city(b.city) = public.normalize_marketplace_city(l.city)
    and lower(trim(coalesce(b.country_code, ''))) = lower(trim(coalesce(l.country_code, '')))
    and lower(trim(coalesce(b.state_code, ''))) = lower(trim(coalesce(l.state_code, '')))
    and b.lat is not null
    and b.lng is not null
    and b.lat <> 0
    and b.lng <> 0
  order by b.created_at desc, b.id desc
  limit 1
) source
where (l.lat is null or l.lng is null)
  and source.lat is not null
  and source.lng is not null;

create index if not exists marketplace_listings_active_geo_idx
  on public.marketplace_listings using gist (
    (st_setsrid(st_makepoint(lng, lat), 4326)::geography)
  )
  where status = 'active' and lat is not null and lng is not null;

create or replace function public.search_marketplace_listings_radius(
  p_origin_lat double precision,
  p_origin_lng double precision,
  p_radius_km double precision default 50,
  p_search text default null,
  p_category_id uuid default null,
  p_listing_type text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_condition text default null,
  p_page integer default 1,
  p_page_size integer default 12
)
returns table (
  listing_id uuid,
  distance_km double precision,
  total_count bigint
)
language sql
stable
set search_path = public, extensions
as $$
  with params as (
    select
      st_setsrid(st_makepoint(p_origin_lng, p_origin_lat), 4326)::geography as origin,
      greatest(least(coalesce(p_radius_km, 50), 500), 1) * 1000 as radius_m,
      nullif(trim(coalesce(p_search, '')), '') as search_term
  ),
  filtered as (
    select
      l.id as listing_id,
      st_distance(
        st_setsrid(st_makepoint(l.lng, l.lat), 4326)::geography,
        p.origin
      ) / 1000.0 as distance_km,
      l.created_at
    from public.marketplace_listings l
    cross join params p
    where
      l.status = 'active'
      and l.lat is not null
      and l.lng is not null
      and st_dwithin(
        st_setsrid(st_makepoint(l.lng, l.lat), 4326)::geography,
        p.origin,
        p.radius_m
      )
      and (p_category_id is null or l.category_id = p_category_id)
      and (p_listing_type is null or l.listing_type = p_listing_type)
      and (p_condition is null or l.condition = p_condition)
      and (p_min_price is null or l.price >= p_min_price)
      and (p_max_price is null or l.price <= p_max_price)
      and (
        p.search_term is null
        or lower(unaccent(concat_ws(' ', l.title, l.description)))
          like '%' || lower(unaccent(p.search_term)) || '%'
        or exists (
          select 1
          from unnest(coalesce(l.keywords, '{}'::text[])) as keyword
          where lower(unaccent(keyword))
            like '%' || lower(unaccent(p.search_term)) || '%'
        )
      )
  )
  select
    f.listing_id,
    f.distance_km,
    count(*) over() as total_count
  from filtered f
  order by f.distance_km asc, f.created_at desc, f.listing_id desc
  limit least(greatest(coalesce(p_page_size, 12), 1), 48)
  offset greatest(coalesce(p_page, 1) - 1, 0) * least(greatest(coalesce(p_page_size, 12), 1), 48);
$$;

revoke execute on function public.search_marketplace_listings_radius(
  double precision,
  double precision,
  double precision,
  text,
  uuid,
  text,
  numeric,
  numeric,
  text,
  integer,
  integer
) from public;

grant execute on function public.search_marketplace_listings_radius(
  double precision,
  double precision,
  double precision,
  text,
  uuid,
  text,
  numeric,
  numeric,
  text,
  integer,
  integer
) to anon, authenticated;
