-- Paginates public business search in the database. The function returns only
-- identifiers, ranking metadata and the total so the application can fetch the
-- current card window without serializing the complete directory into the HTML.
create or replace function public.search_public_businesses(
  p_limit integer default 6,
  p_offset integer default 0,
  p_query text default null,
  p_category_id text default null,
  p_query_category_ids text[] default null,
  p_city text default null,
  p_city_aliases text[] default null,
  p_location text default null,
  p_country_code text default null,
  p_state_code text default null,
  p_origin_lat double precision default null,
  p_origin_lng double precision default null,
  p_radius_km double precision default null
)
returns table (
  business_id uuid,
  total_count bigint
)
language sql
stable
set search_path = public
as $$
  with params as (
    select
      nullif(trim(coalesce(p_query, '')), '') as search_query,
      nullif(trim(coalesce(p_category_id, '')), '') as filter_category_id,
      array_remove(array(select nullif(trim(value), '') from unnest(coalesce(p_query_category_ids, '{}'::text[])) as value), null) as filter_query_category_ids,
      nullif(trim(coalesce(p_city, '')), '') as filter_city_text,
      array_remove(array(select nullif(trim(value), '') from unnest(coalesce(p_city_aliases, '{}'::text[])) as value), null) as filter_city_aliases,
      nullif(trim(coalesce(p_location, '')), '') as filter_location_text,
      nullif(trim(coalesce(p_country_code, '')), '') as filter_country_code,
      nullif(trim(coalesce(p_state_code, '')), '') as filter_state_code,
      case
        when p_origin_lat is not null and p_origin_lng is not null and coalesce(p_radius_km, 0) > 0
          then st_setsrid(st_makepoint(p_origin_lng, p_origin_lat), 4326)::geography
        else null
      end as origin_geog,
      greatest(coalesce(p_radius_km, 0), 0) * 1000 as radius_m
  ),
  base as (
    select
      b.id,
      b.created_at,
      case
        when p.origin_geog is null then null
        else st_distance(st_setsrid(st_makepoint(b.lng, b.lat), 4326)::geography, p.origin_geog) / 1000.0
      end as distance_km,
      lower(unaccent(concat_ws(
        ' ',
        coalesce(b.name, ''),
        coalesce(b.description, ''),
        coalesce(b.category_id, ''),
        coalesce(b.primary_activity, ''),
        coalesce(b.primary_activity_custom, ''),
        coalesce(b.city, ''),
        coalesce(b.state, ''),
        coalesce(b.country, ''),
        coalesce((select string_agg(value, ' ') from jsonb_array_elements_text(coalesce(to_jsonb(b.keywords), '[]'::jsonb)) as value), ''),
        coalesce((select string_agg(value, ' ') from jsonb_array_elements_text(coalesce(to_jsonb(b.services), '[]'::jsonb)) as value), ''),
        coalesce((select string_agg(concat_ws(' ', item->>'name', item->>'description'), ' ') from jsonb_array_elements(coalesce(to_jsonb(b.menu), '[]'::jsonb)) as item), ''),
        coalesce((select string_agg(concat_ws(' ', item->>'name', item->>'description'), ' ') from jsonb_array_elements(coalesce(to_jsonb(b.service_items), '[]'::jsonb)) as item), '')
      ))) as search_blob,
      b.category_id,
      b.attendance_type,
      b.street,
      b.city,
      b.state,
      b.country,
      b.country_code,
      b.state_code,
      b.lat,
      b.lng,
      p.*
    from public.businesses b
    cross join params p
    where coalesce(b.moderation_status, 'approved') = 'approved'
  ),
  filtered as (
    select base.*, case when search_query is null then 0 else 1 end as query_rank
    from base
    where
      (filter_category_id is null or base.category_id = filter_category_id)
      and (filter_country_code is null or lower(coalesce(base.country_code, '')) = lower(filter_country_code))
      and (filter_state_code is null or lower(coalesce(base.state_code, '')) = lower(filter_state_code))
      and (
        filter_city_text is null or exists (
          select 1 from unnest(case when cardinality(filter_city_aliases) > 0 then filter_city_aliases else array[filter_city_text] end) as candidate(value)
          where lower(unaccent(coalesce(base.city, ''))) like '%' || lower(unaccent(candidate.value)) || '%'
        )
      )
      and (
        filter_location_text is null or lower(unaccent(concat_ws(' ', coalesce(base.street, ''), coalesce(base.city, ''), coalesce(base.state, ''), coalesce(base.country, ''))))
          like '%' || lower(unaccent(filter_location_text)) || '%'
      )
      and (
        origin_geog is null or (
          base.lat is not null and base.lng is not null
          and nullif(trim(coalesce(base.city, '')), '') is not null
          and nullif(trim(coalesce(base.country_code, '')), '') is not null
          and (nullif(trim(coalesce(base.state_code, '')), '') is not null or nullif(trim(coalesce(base.state, '')), '') is not null)
          and st_dwithin(st_setsrid(st_makepoint(base.lng, base.lat), 4326)::geography, origin_geog, radius_m)
          and (coalesce(base.attendance_type, 'presencial') = 'online' or nullif(trim(coalesce(base.street, '')), '') is not null)
        )
      )
      and (
        search_query is null or base.category_id = any(coalesce(filter_query_category_ids, '{}'::text[])) or not exists (
          select 1 from regexp_split_to_table(lower(unaccent(search_query)), E'\\s+') as term(value)
          where term.value <> '' and base.search_blob not like '%' || term.value || '%'
        )
      )
  ),
  ordered as (
    select id, count(*) over() as total_count, query_rank, distance_km, created_at from filtered
  )
  select business_id, total_count
  from (
    select id as business_id, total_count, query_rank, distance_km, created_at
    from ordered
    order by query_rank desc, distance_km asc nulls last, created_at desc, business_id asc
    limit least(greatest(coalesce(p_limit, 6), 1), 100)
    offset greatest(coalesce(p_offset, 0), 0)
  ) paged;
$$;

grant execute on function public.search_public_businesses(
  integer, integer, text, text, text[], text, text[], text, text, text,
  double precision, double precision, double precision
) to anon, authenticated;