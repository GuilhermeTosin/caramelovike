-- Return only the aggregates and current page needed by the public directory.
-- This keeps /negocios from transferring the complete public business index.
create or replace function public.get_public_business_directory(
  p_country_code text default null,
  p_state_code text default null,
  p_city_slug text default null,
  p_category_id text default null,
  p_page integer default 1,
  p_page_size integer default 10
)
returns jsonb
language sql
stable
set search_path = public
as $$
with params as (
  select
    nullif(lower(trim(coalesce(p_country_code, ''))), '') as country_code,
    nullif(lower(trim(coalesce(p_state_code, ''))), '') as state_code,
    nullif(lower(trim(coalesce(p_city_slug, ''))), '') as city_slug,
    nullif(lower(trim(coalesce(p_category_id, ''))), '') as category_id,
    greatest(coalesce(p_page, 1), 1) as page,
    least(greatest(coalesce(p_page_size, 10), 1), 25) as page_size
),
base as (
  select
    b.id,
    b.owner_id,
    b.name,
    b.slug,
    b.category_id,
    b.primary_activity,
    b.primary_activity_custom,
    b.logo_url,
    b.hero_image,
    b.street,
    b.city,
    b.city_slug,
    b.location_id,
    l.display_name_pt_br as location_display_name_pt_br,
    b.state,
    b.country,
    b.country_code,
    b.state_code,
    b.postal_code,
    b.lat,
    b.lng,
    b.attendance_type,
    b.average_rating,
    b.owner_verified,
    b.owner_verified_until,
    b.created_at,
    b.updated_at,
    lower(trim(coalesce(b.country_code, ''))) as country_key,
    lower(trim(coalesce(b.state_code, ''))) as state_key,
    coalesce(
      nullif(lower(trim(b.city_slug)), ''),
      nullif(lower(trim(l.city_slug)), ''),
      trim(both '-' from regexp_replace(
        regexp_replace(lower(unaccent(coalesce(b.city, ''))), '[^a-z0-9]+', '-', 'g'),
        '-+', '-', 'g'
      ))
    ) as city_key,
    coalesce(nullif(trim(l.display_name_pt_br), ''), nullif(trim(b.city), '')) as city_label,
    coalesce(
      nullif(trim(b.primary_activity), ''),
      nullif(trim(b.category_id), ''),
      'other'
    ) as category_key
  from public.businesses b
  left join public.business_locations l on l.id = b.location_id
  where coalesce(b.moderation_status, 'approved') = 'approved'
),
country_scope as (
  select b.*
  from base b
  cross join params p
  where p.country_code is null or b.country_key = p.country_code
),
state_scope as (
  select b.*
  from country_scope b
  cross join params p
  where p.state_code is null or b.state_key = p.state_code
),
city_scope as (
  select b.*
  from state_scope b
  cross join params p
  where p.city_slug is null or b.city_key = p.city_slug
),
category_scope as (
  select b.*
  from city_scope b
  cross join params p
  where p.category_id is null or b.category_key = p.category_id
),
country_counts as (
  select country_key as code, count(*)::integer as count
  from base
  where country_key <> ''
  group by country_key
),
state_counts as (
  select
    state_key as code,
    (array_agg(
      coalesce(nullif(trim(state), ''), state_key)
      order by
        case when lower(trim(coalesce(state, ''))) = state_key then 0 else 1 end desc,
        length(coalesce(nullif(trim(state), ''), state_key)) desc,
        coalesce(nullif(trim(state), ''), state_key)
    ))[1] as label,
    count(*)::integer as count
  from country_scope
  where state_key <> ''
  group by state_key
),
city_counts as (
  select
    city_key as slug,
    (array_agg(
      coalesce(nullif(trim(city_label), ''), nullif(trim(city), ''), city_key)
      order by length(coalesce(nullif(trim(city_label), ''), nullif(trim(city), ''), city_key)) desc
    ))[1] as label,
    count(*)::integer as count
  from state_scope
  where city_key <> ''
  group by city_key
),
category_counts as (
  select category_key as key, count(*)::integer as count
  from city_scope
  where category_key <> ''
  group by category_key
),
paged_businesses as (
  select b.*
  from category_scope b
  cross join params p
  where p.city_slug is not null
  order by b.country_key, b.state_key, b.city_key, lower(coalesce(b.name, '')), b.id
  limit (select page_size from params)
  offset ((select page from params) - 1) * (select page_size from params)
)
select jsonb_build_object(
  'route_exists', (
    select case
      when p.country_code is null then true
      when not exists (select 1 from country_scope) then false
      when p.state_code is null then true
      when not exists (select 1 from state_scope) then false
      when p.city_slug is null then true
      else exists (select 1 from city_scope)
    end
    from params p
  ),
  'country_counts', (
    select coalesce(jsonb_agg(to_jsonb(c) order by c.code), '[]'::jsonb)
    from country_counts c
  ),
  'state_counts', (
    select coalesce(jsonb_agg(to_jsonb(s) order by s.label, s.code), '[]'::jsonb)
    from state_counts s
  ),
  'city_counts', (
    select coalesce(jsonb_agg(to_jsonb(c) order by c.label, c.slug), '[]'::jsonb)
    from city_counts c
  ),
  'category_counts', (
    select coalesce(jsonb_agg(to_jsonb(c) order by c.key), '[]'::jsonb)
    from category_counts c
  ),
  'scope_total', (select count(*)::integer from city_scope),
  'scope_verified_total', (
    select count(*)::integer
    from city_scope
    where owner_verified is true
      and owner_verified_until is not null
      and owner_verified_until >= now()
  ),
  'scope_latest_created_at', (select max(created_at) from city_scope),
  'current_total', (
    select case
      when p.city_slug is null then 0
      else (select count(*)::integer from category_scope)
    end
    from params p
  ),
  'total_pages', (
    select case
      when p.city_slug is null then 1
      else greatest(1, ceil((select count(*)::numeric from category_scope) / p.page_size)::integer)
    end
    from params p
  ),
  'page_businesses', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'owner_id', b.owner_id,
      'name', b.name,
      'slug', b.slug,
      'category_id', b.category_id,
      'primary_activity', b.primary_activity,
      'primary_activity_custom', b.primary_activity_custom,
      'logo_url', b.logo_url,
      'hero_image', b.hero_image,
      'street', b.street,
      'city', b.city,
      'city_slug', b.city_slug,
      'location_id', b.location_id,
      'location_display_name_pt_br', b.location_display_name_pt_br,
      'state', b.state,
      'country', b.country,
      'country_code', b.country_code,
      'state_code', b.state_code,
      'postal_code', b.postal_code,
      'lat', b.lat,
      'lng', b.lng,
      'attendance_type', b.attendance_type,
      'average_rating', b.average_rating,
      'owner_verified', b.owner_verified,
      'owner_verified_until', b.owner_verified_until,
      'created_at', b.created_at,
      'updated_at', b.updated_at
    ) order by b.country_key, b.state_key, b.city_key, lower(coalesce(b.name, '')), b.id), '[]'::jsonb)
    from paged_businesses b
  )
);
$$;

grant execute on function public.get_public_business_directory(text, text, text, text, integer, integer)
  to anon, authenticated;

create index if not exists idx_businesses_public_directory_scope
  on public.businesses (country_code, state_code, city_slug, primary_activity, created_at desc)
  where coalesce(moderation_status, 'approved') = 'approved';
