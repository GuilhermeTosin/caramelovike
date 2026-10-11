-- Permite que administradores removam qualquer negócio pelo dashboard.
-- A exclusão continua protegida por RLS e a política do proprietário permanece ativa.

drop policy if exists "Admins can delete businesses" on public.businesses;

create policy "Admins can delete businesses"
  on public.businesses
  for delete
  to authenticated
  using (public.is_admin());
