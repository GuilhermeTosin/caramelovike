-- Estados de moderação não podem ser alterados pelo proprietário do anúncio.
-- Proprietários podem pausar, reativar, marcar como vendido e reativar anúncios
-- vendidos/expirados. Remoção e restauração ficam reservadas ao administrador.

create or replace function public.prevent_marketplace_status_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_service_role boolean := coalesce(auth.role(), '') = 'service_role';
  caller_is_admin boolean := caller_is_service_role or public.is_admin(auth.uid());
  owner_transition_allowed boolean := (
    (old.status = 'draft' and new.status = 'active')
    or (old.status = 'active' and new.status in ('paused', 'sold'))
    or (old.status in ('paused', 'sold', 'expired') and new.status = 'active')
  );
begin
  if new.status is distinct from old.status
     and not caller_is_admin
     and not owner_transition_allowed then
    raise exception 'A situação deste anúncio só pode ser alterada por um administrador.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_marketplace_listing_status on public.marketplace_listings;
create trigger protect_marketplace_listing_status
before update of status on public.marketplace_listings
for each row
execute function public.prevent_marketplace_status_escalation();

drop policy if exists marketplace_listings_owner_insert on public.marketplace_listings;
create policy marketplace_listings_owner_insert
  on public.marketplace_listings for insert to authenticated
  with check (
    auth.uid() = owner_id
    and status in ('draft', 'active')
  );

drop policy if exists marketplace_listings_owner_update on public.marketplace_listings;
create policy marketplace_listings_owner_update
  on public.marketplace_listings for update to authenticated
  using (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'admin'
    )
    or (auth.uid() = owner_id and status <> 'removed')
  )
  with check (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'admin'
    )
    or (auth.uid() = owner_id and status <> 'removed')
  );

drop policy if exists marketplace_listings_owner_delete on public.marketplace_listings;
create policy marketplace_listings_owner_delete
  on public.marketplace_listings for delete to authenticated
  using (
    exists (
      select 1
      from public.profiles as profile
      where profile.id = auth.uid()
        and profile.role = 'admin'
    )
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
          exists (
            select 1
            from public.profiles as profile
            where profile.id = auth.uid()
              and profile.role = 'admin'
          )
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
          exists (
            select 1
            from public.profiles as profile
            where profile.id = auth.uid()
              and profile.role = 'admin'
          )
          or (listing.owner_id = auth.uid() and listing.status <> 'removed')
        )
    )
  );
