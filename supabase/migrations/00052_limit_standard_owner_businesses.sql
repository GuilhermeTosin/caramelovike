-- Contas comuns podem manter apenas um negocio ativo por vez.
-- Negocios rejeitados nao bloqueiam um novo envio; admins e editores nao tem limite.

create or replace function public.enforce_standard_owner_business_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin_or_editor(new.owner_id) then
    return new;
  end if;

  if coalesce(new.moderation_status, 'approved') = 'rejected' then
    return new;
  end if;

  -- Serializa criacoes/aprovacoes do mesmo proprietario para evitar corrida.
  perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text, 0));

  if exists (
    select 1
    from public.businesses as existing
    where existing.owner_id = new.owner_id
      and existing.id is distinct from new.id
      and coalesce(existing.moderation_status, 'approved') <> 'rejected'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Usuarios comuns podem ter apenas um negocio ativo.';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_standard_owner_business_limit() from public;

drop trigger if exists enforce_standard_owner_business_limit on public.businesses;
create trigger enforce_standard_owner_business_limit
  before insert or update of owner_id, moderation_status
  on public.businesses
  for each row
  execute function public.enforce_standard_owner_business_limit();
