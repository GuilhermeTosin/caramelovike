begin;

-- Reporters can submit a report, but only administrators can read the queue.
-- Restrictive policies cap any older permissive policies in production.
drop policy if exists marketplace_reports_admin_select on public.marketplace_reports;
create policy marketplace_reports_admin_select
  on public.marketplace_reports for select to authenticated
  using (public.is_admin());

drop policy if exists marketplace_reports_admin_select_ceiling on public.marketplace_reports;
create policy marketplace_reports_admin_select_ceiling
  on public.marketplace_reports as restrictive for select to authenticated
  using (public.is_admin());

drop policy if exists marketplace_reports_anon_select_ceiling on public.marketplace_reports;
create policy marketplace_reports_anon_select_ceiling
  on public.marketplace_reports as restrictive for select to anon
  using (false);

drop policy if exists marketplace_reports_admin_update_ceiling on public.marketplace_reports;
create policy marketplace_reports_admin_update_ceiling
  on public.marketplace_reports as restrictive for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke select, update on public.marketplace_reports from public, anon, authenticated;
grant select on public.marketplace_reports to authenticated;
grant update (status) on public.marketplace_reports to authenticated;

commit;
