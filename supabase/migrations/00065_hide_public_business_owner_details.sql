begin;

-- Anonymous users may read only the public columns of business and event rows.
-- Authenticated table-level privileges are intentionally left unchanged so
-- owners and administrators retain access to their internal records.
revoke select on table public.businesses from public, anon;
revoke select on table public.events from public, anon;

do $migration$
declare
  v_column_name text;
  v_public_columns text;
begin
  -- Remove any older column-level grants as well as relation-level grants.
  for v_column_name in
    select attribute.attname
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'public.businesses'::regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
  loop
    execute format(
      'revoke select (%I) on table public.businesses from public, anon',
      v_column_name
    );
  end loop;

  for v_column_name in
    select attribute.attname
    from pg_catalog.pg_attribute as attribute
    where attribute.attrelid = 'public.events'::regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
  loop
    execute format(
      'revoke select (%I) on table public.events from public, anon',
      v_column_name
    );
  end loop;

  -- Allowlist public business fields. Internal ownership and moderation
  -- reviewer metadata remain readable only to authenticated/internal roles.
  select string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum)
    into v_public_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.businesses'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname = any(array[
      'id', 'name', 'slug', 'category_id', 'primary_activity', 'primary_activity_custom',
      'description', 'hero_image', 'logo_url', 'street', 'city', 'city_slug', 'location_id',
      'state', 'country', 'country_code', 'state_code', 'postal_code', 'lat', 'lng',
      'attendance_type', 'services', 'service_items', 'keywords', 'menu', 'menu_pdf_url',
      'is_brazilian_owned', 'serves_portuguese', 'is_vegan_friendly',
      'is_vegetarian_friendly', 'is_gluten_free_friendly', 'photos', 'phone', 'email',
      'website', 'instagram', 'facebook', 'whatsapp', 'reviews', 'average_rating',
      'owner_verified', 'owner_verified_until', 'moderation_status', 'opening_hours',
      'promotions', 'events', 'created_at', 'updated_at'
    ]::text[]);

  if v_public_columns is null then
    raise exception 'No public business columns found for anonymous access';
  end if;
  execute format('grant select (%s) on table public.businesses to anon', v_public_columns);

  select string_agg(format('%I', attribute.attname), ', ' order by attribute.attnum)
    into v_public_columns
  from pg_catalog.pg_attribute as attribute
  where attribute.attrelid = 'public.events'::regclass
    and attribute.attnum > 0
    and not attribute.attisdropped
    and attribute.attname = any(array[
      'id', 'business_id', 'title', 'description', 'date', 'location', 'is_free', 'price',
      'flyer_url', 'ticket_url', 'status', 'created_at', 'updated_at'
    ]::text[]);

  if v_public_columns is null then
    raise exception 'No public event columns found for anonymous access';
  end if;
  execute format('grant select (%s) on table public.events to anon', v_public_columns);
end;
$migration$;

-- The public directory RPC historically serialized owner_id in each item.
-- Keep its internal query intact but remove private ownership keys at the
-- public RPC boundary, and make the underlying function non-callable via API.
alter function public.get_public_business_directory(text, text, text, text, integer, integer)
  rename to get_public_business_directory_internal;
revoke all on function public.get_public_business_directory_internal(text, text, text, text, integer, integer)
  from public, anon, authenticated;

create function public.get_public_business_directory(
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
security definer
set search_path = ''
as $function$
  with directory_result as (
    select public.get_public_business_directory_internal(
      p_country_code,
      p_state_code,
      p_city_slug,
      p_category_id,
      p_page,
      p_page_size
    ) as payload
  )
  select jsonb_set(
    directory_result.payload,
    '{page_businesses}',
    coalesce(
      (
        select jsonb_agg(
          item.value - 'owner_id' - 'ownerId' - 'ownerName'
          order by item.ordinality
        )
        from jsonb_array_elements(
          coalesce(directory_result.payload -> 'page_businesses', '[]'::jsonb)
        ) with ordinality as item(value, ordinality)
      ),
      '[]'::jsonb
    ),
    true
  )
  from directory_result;
$function$;

revoke all on function public.get_public_business_directory(text, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.get_public_business_directory(text, text, text, text, integer, integer)
  to anon, authenticated;

-- Client code supplies only the business ID; the database resolves the
-- current owner and verifies that the caller may use these ownership checks.
create or replace function public.is_current_user_business_owner(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select auth.uid() is not null
    and exists (
      select 1
      from public.businesses as business
      where business.id = p_business_id
        and business.owner_id = auth.uid()
    );
$function$;

revoke all on function public.is_current_user_business_owner(uuid) from public, anon;
grant execute on function public.is_current_user_business_owner(uuid) to authenticated;

create or replace function public.create_business_conversation(p_business_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_caller_id uuid := auth.uid();
  v_owner_id uuid;
  v_business_name text;
begin
  if v_caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select business.owner_id, business.name
    into v_owner_id, v_business_name
  from public.businesses as business
  where business.id = p_business_id
    and coalesce(business.moderation_status, 'approved') = 'approved'
  for share;

  if not found then
    raise exception 'Published business not found' using errcode = 'P0002';
  end if;
  if v_owner_id is null or v_caller_id = v_owner_id then
    raise exception 'A business owner cannot start a conversation with themselves'
      using errcode = '42501';
  end if;

  return public.create_conversation_with_context(
    p_business_id,
    v_business_name,
    array[v_caller_id, v_owner_id],
    'business',
    null
  );
end;
$function$;

revoke all on function public.create_business_conversation(uuid) from public, anon;
grant execute on function public.create_business_conversation(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
