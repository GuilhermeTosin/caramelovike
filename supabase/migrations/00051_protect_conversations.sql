begin;

-- Membership changes belong to validated RPCs or trusted administrative code.
drop policy if exists "Anyone can join a conversation" on public.conversation_participants;
drop policy if exists "Participants can insert participants" on public.conversation_participants;
drop policy if exists participants_insert on public.conversation_participants;
revoke insert, update, delete on public.conversation_participants from public, anon, authenticated;
revoke insert, update on public.conversations from public, anon, authenticated;
drop policy if exists conversations_insert on public.conversations;

create or replace function public.is_conversation_participant(conv_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.conversation_participants
    where conversation_id = conv_id and user_id = auth.uid()
  );
$$;

revoke all on function public.is_conversation_participant(uuid) from public, anon;
grant execute on function public.is_conversation_participant(uuid) to authenticated;

create or replace function public.create_conversation_with_participants(
  p_business_id uuid,
  p_business_name text,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  participant_ids uuid[];
  conversation_id uuid;
  business_owner_id uuid;
  business_name text := p_business_name;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select array_agg(distinct participant_id) into participant_ids
  from unnest(p_participant_ids) as participants(participant_id)
  where participant_id is not null;

  if cardinality(p_participant_ids) is distinct from 2
     or cardinality(participant_ids) is distinct from 2
     or not (caller_id = any(participant_ids)) then
    raise exception 'A conversation requires the caller and one recipient' using errcode = '42501';
  end if;

  if p_business_id is not null then
    select b.owner_id, b.name into business_owner_id, business_name
    from public.businesses b where b.id = p_business_id;
    if business_owner_id is null or not (business_owner_id = any(participant_ids)) then
      raise exception 'The business owner must participate' using errcode = '42501';
    end if;
  end if;

  insert into public.conversations (business_id, business_name)
  values (p_business_id, business_name) returning id into conversation_id;
  insert into public.conversation_participants (conversation_id, user_id)
  select conversation_id, participant_id from unnest(participant_ids) as participants(participant_id);
  return conversation_id;
end;
$$;

revoke all on function public.create_conversation_with_participants(uuid, text, uuid[]) from public, anon;
grant execute on function public.create_conversation_with_participants(uuid, text, uuid[]) to authenticated;

-- Never allow a client to rewrite a message's author, text, or conversation.
revoke insert, update on public.messages from public, anon, authenticated;
grant insert (conversation_id, sender_id, text) on public.messages to authenticated;
grant update (read) on public.messages to authenticated;

drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages
for update to authenticated
using (public.is_conversation_participant(conversation_id) and sender_id <> auth.uid())
with check (public.is_conversation_participant(conversation_id) and sender_id <> auth.uid() and read = true);

-- A restrictive policy also protects installations with additional old policies.
drop policy if exists messages_read_receipt_guard on public.messages;
create policy messages_read_receipt_guard on public.messages as restrictive
for update to authenticated
using (public.is_conversation_participant(conversation_id) and sender_id <> auth.uid())
with check (public.is_conversation_participant(conversation_id) and sender_id <> auth.uid() and read = true);

create or replace function public.update_conversation_last_message()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.conversations
  set last_message = new.text, last_message_at = new.created_at
  where id = new.conversation_id
    and (last_message_at is null or last_message_at <= new.created_at);
  return new;
end;
$$;
revoke all on function public.update_conversation_last_message() from public, anon, authenticated;
drop trigger if exists update_conversation_last_message on public.messages;
create trigger update_conversation_last_message
after insert on public.messages
for each row execute function public.update_conversation_last_message();

commit;
