begin;

-- RLS policies must not read private profile rows as anon. This helper only
-- answers whether the current request belongs to an admin; callers cannot pass
-- another user's ID to probe roles.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = auth.uid()
      and profile.role = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to anon, authenticated;

drop policy if exists marketplace_listings_public_read on public.marketplace_listings;
create policy marketplace_listings_public_read
  on public.marketplace_listings for select to anon, authenticated
  using (
    status = 'active'
    or auth.uid() = owner_id
    or public.current_user_is_admin()
  );

drop policy if exists marketplace_listings_owner_update on public.marketplace_listings;
create policy marketplace_listings_owner_update
  on public.marketplace_listings for update to authenticated
  using (
    public.current_user_is_admin()
    or (auth.uid() = owner_id and status <> 'removed')
  )
  with check (
    public.current_user_is_admin()
    or (auth.uid() = owner_id and status <> 'removed')
  );

drop policy if exists marketplace_listings_owner_delete on public.marketplace_listings;
create policy marketplace_listings_owner_delete
  on public.marketplace_listings for delete to authenticated
  using (
    public.current_user_is_admin()
    or (auth.uid() = owner_id and status <> 'removed')
  );

drop policy if exists marketplace_images_owner_manage on public.marketplace_listing_images;
create policy marketplace_images_owner_manage
  on public.marketplace_listing_images for all to authenticated
  using (
    exists (
      select 1
      from public.marketplace_listings as listing
      where listing.id = listing_id
        and (
          public.current_user_is_admin()
          or (listing.owner_id = auth.uid() and listing.status <> 'removed')
        )
    )
  )
  with check (
    exists (
      select 1
      from public.marketplace_listings as listing
      where listing.id = listing_id
        and (
          public.current_user_is_admin()
          or (listing.owner_id = auth.uid() and listing.status <> 'removed')
        )
    )
  );

drop policy if exists marketplace_reports_admin_manage on public.marketplace_reports;
create policy marketplace_reports_admin_manage
  on public.marketplace_reports for all to authenticated
  using (public.current_user_is_admin())
  with check (public.current_user_is_admin());

commit;
