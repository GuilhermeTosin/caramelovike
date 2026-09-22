-- Keep profile contact and location fields private while preserving the
-- public identity fields used by business, marketplace, and messaging UI.
begin;

alter table public.profiles enable row level security;

drop policy if exists "Anyone can view profiles" on public.profiles;
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- Restrictive policies form a ceiling even if another permissive SELECT policy
-- is added later by an operator or an older migration.
drop policy if exists profiles_select_private_ceiling on public.profiles;
create policy profiles_select_private_ceiling
  on public.profiles as restrictive for select to authenticated
  using (id = auth.uid() or public.is_admin());

revoke select on table public.profiles from public, anon;

-- Remove any prior per-column grants to anonymous callers as well as the
-- table-level grant. The profile schema can gain columns independently.
do $$
declare
  profile_column record;
begin
  for profile_column in
    select attribute.attname
    from pg_attribute as attribute
    where attribute.attrelid = 'public.profiles'::regclass
      and attribute.attnum > 0
      and not attribute.attisdropped
  loop
    execute format(
      'revoke select (%I) on table public.profiles from public, anon',
      profile_column.attname
    );
  end loop;
end;
$$;

grant select on table public.profiles to authenticated;

-- The view uses its owner's table access intentionally; this allowlist is the
-- public boundary and must not include private profile fields.
create or replace view public.public_profiles
  with (security_barrier = true)
as
  select id, name, avatar, created_at
  from public.profiles;

revoke all on table public.public_profiles from public;
grant select on table public.public_profiles to anon, authenticated;

commit;
