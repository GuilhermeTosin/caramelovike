-- Permite separar cadastro e gerenciamento de negócios de funções administrativas.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'editor', 'admin'));

create or replace function public.is_editor(user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = user_id
      and role = 'editor'
  );
$$;

create or replace function public.is_admin_or_editor(user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = user_id
      and role in ('admin', 'editor')
  );
$$;

create table if not exists public.business_managers (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (business_id, user_id)
);

create index if not exists business_managers_user_idx
  on public.business_managers (user_id, created_at desc);

alter table public.business_managers enable row level security;

drop policy if exists business_managers_self_read on public.business_managers;
create policy business_managers_self_read
  on public.business_managers for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists business_managers_admin_manage on public.business_managers;
create policy business_managers_admin_manage
  on public.business_managers for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists businesses_editor_update_assigned on public.businesses;
create policy businesses_editor_update_assigned
  on public.businesses for update to authenticated
  using (
    exists (
      select 1
      from public.business_managers manager
      where manager.business_id = businesses.id
        and manager.user_id = auth.uid()
        and public.is_editor(auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.business_managers manager
      where manager.business_id = businesses.id
        and manager.user_id = auth.uid()
        and public.is_editor(auth.uid())
    )
  );

revoke execute on function public.is_editor(uuid) from public;
revoke execute on function public.is_admin_or_editor(uuid) from public;
grant execute on function public.is_editor(uuid) to authenticated;
grant execute on function public.is_admin_or_editor(uuid) to authenticated;
grant select on public.business_managers to authenticated;
grant insert, update, delete on public.business_managers to authenticated;
