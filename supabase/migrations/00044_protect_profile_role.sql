-- Impede que usuários autenticados alterem seus próprios privilégios.
-- Alterações em profiles.role devem passar pela API administrativa, que usa
-- a chave service_role no servidor.

create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'A função do usuário só pode ser alterada por um administrador.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update of role on public.profiles
for each row
execute function public.prevent_profile_role_escalation();

-- Remova privilégios amplos antes de conceder somente os campos editáveis.
-- RLS continua controlando quais linhas podem ser alteradas.
revoke insert, update on public.profiles from anon, authenticated;

grant insert (id, name, bio, phone, location, avatar)
  on public.profiles to authenticated;

grant update (name, bio, phone, location, avatar)
  on public.profiles to authenticated;
