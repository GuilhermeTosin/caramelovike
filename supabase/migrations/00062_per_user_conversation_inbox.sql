begin;

alter table public.conversation_participants
  add column if not exists hidden_at timestamptz;

create index if not exists conversation_participants_visible_by_user_idx
  on public.conversation_participants (user_id, conversation_id)
  where hidden_at is null;

create or replace function public.hide_conversation_for_user(p_conversation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  update public.conversation_participants
  set hidden_at = coalesce(hidden_at, now())
  where conversation_id = p_conversation_id
    and user_id = caller_id;

  return found;
end;
$$;

revoke all on function public.hide_conversation_for_user(uuid)
  from public, anon;
grant execute on function public.hide_conversation_for_user(uuid)
  to authenticated;

create or replace function public.get_my_unread_conversation_counts()
returns table (conversation_id uuid, unread_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select m.conversation_id, count(*)::bigint as unread_count
  from public.conversation_participants cp
  join public.messages m on m.conversation_id = cp.conversation_id
  where cp.user_id = auth.uid()
    and cp.hidden_at is null
    and m.sender_id <> auth.uid()
    and m.read = false
  group by m.conversation_id;
$$;

revoke all on function public.get_my_unread_conversation_counts()
  from public, anon;
grant execute on function public.get_my_unread_conversation_counts()
  to authenticated;

create or replace function public.restore_hidden_conversation_for_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.conversation_participants
  set hidden_at = null
  where conversation_id = new.conversation_id
    and hidden_at is not null;

  return new;
end;
$$;

revoke all on function public.restore_hidden_conversation_for_message()
  from public, anon, authenticated;

drop trigger if exists restore_hidden_conversation_for_message
  on public.messages;
create trigger restore_hidden_conversation_for_message
after insert on public.messages
for each row
execute function public.restore_hidden_conversation_for_message();

commit;
