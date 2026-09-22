-- Conversations belong to their user participants. A business reference is
-- context only and must never transfer historical access to a new owner.
begin;

alter table public.conversations
  add column if not exists initiator_id uuid
    references public.profiles(id) on delete set null,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_reason text;

create index if not exists conversations_business_open_idx
  on public.conversations (business_id, closed_at)
  where business_id is not null;

-- Existing pairwise business chats are initiated by the customer. Keep the
-- first message author as the historical customer when closing transferred
-- conversations below.
with first_messages as (
  select distinct on (message.conversation_id)
    message.conversation_id,
    message.sender_id
  from public.messages as message
  order by message.conversation_id, message.created_at, message.id
)
update public.conversations as conversation
set initiator_id = first_messages.sender_id
from first_messages
where conversation.id = first_messages.conversation_id
  and conversation.initiator_id is null;

-- Transfers historically appended owners to participant lists. A business
-- chat with more than two members, or one missing the current owner, is stale.
with business_conversation_state as (
  select
    conversation.id,
    conversation.initiator_id,
    business.owner_id,
    count(participant.user_id) as participant_count,
    coalesce(bool_or(participant.user_id = business.owner_id), false) as has_current_owner
  from public.conversations as conversation
  join public.businesses as business on business.id = conversation.business_id
  left join public.conversation_participants as participant
    on participant.conversation_id = conversation.id
  group by conversation.id, conversation.initiator_id, business.owner_id
)
update public.conversations as conversation
set closed_at = coalesce(conversation.closed_at, now()),
    closed_reason = coalesce(conversation.closed_reason, 'business_owner_changed')
from business_conversation_state as state
where state.id = conversation.id
  and (state.participant_count > 2 or not state.has_current_owner);

-- Preserve history for the original customer only. Never preserve a current
-- or known approved claimant as a recipient inherited through ownership.
delete from public.conversation_participants as participant
using public.conversations as conversation,
      public.businesses as business
where participant.conversation_id = conversation.id
  and business.id = conversation.business_id
  and conversation.closed_reason = 'business_owner_changed'
  and (
    participant.user_id is distinct from conversation.initiator_id
    or participant.user_id = business.owner_id
    or exists (
      select 1
      from public.owner_claim_requests as claim
      where claim.business_id = business.id
        and claim.requested_by = participant.user_id
        and claim.status = 'approved'
    )
  );

create or replace function public.close_business_chats_on_owner_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is not distinct from old.owner_id then
    return new;
  end if;

  update public.conversations as conversation
  set closed_at = coalesce(conversation.closed_at, now()),
      closed_reason = coalesce(conversation.closed_reason, 'business_owner_changed')
  where conversation.business_id = new.id;

  delete from public.conversation_participants as participant
  using public.conversations as conversation
  where conversation.id = participant.conversation_id
    and conversation.business_id = new.id
    and (
      participant.user_id is distinct from conversation.initiator_id
      or participant.user_id = old.owner_id
      or participant.user_id = new.owner_id
      or exists (
        select 1
        from public.owner_claim_requests as claim
        where claim.business_id = new.id
          and claim.requested_by = participant.user_id
          and claim.status = 'approved'
      )
    );

  return new;
end;
$$;

revoke all on function public.close_business_chats_on_owner_change()
  from public, anon, authenticated;

drop trigger if exists close_business_chats_on_owner_change on public.businesses;
create trigger close_business_chats_on_owner_change
after update of owner_id on public.businesses
for each row
when (old.owner_id is distinct from new.owner_id)
execute function public.close_business_chats_on_owner_change();

create or replace function public.prevent_membership_in_closed_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.conversations as conversation
    where conversation.id = new.conversation_id
      and conversation.closed_at is not null
  ) then
    raise exception 'Closed conversations cannot accept participants.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_membership_in_closed_conversation()
  from public, anon, authenticated;

drop trigger if exists prevent_membership_in_closed_conversation
  on public.conversation_participants;
create trigger prevent_membership_in_closed_conversation
before insert on public.conversation_participants
for each row
execute function public.prevent_membership_in_closed_conversation();

-- Participant RLS remains the access authority, but a historical closed chat
-- is read-only even if an old membership remains or a caller races a transfer.
drop policy if exists messages_open_conversation_insert_ceiling on public.messages;
create policy messages_open_conversation_insert_ceiling
  on public.messages as restrictive for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and exists (
      select 1
      from public.conversations as conversation
      where conversation.id = messages.conversation_id
        and conversation.closed_at is null
    )
  );

-- A row lock serializes conversation creation against an ownership update.
-- Without it, a chat addressed to the old owner could be inserted after the
-- transfer trigger had already swept the business conversations.
create or replace function public.create_conversation_with_participants(
  p_business_id uuid,
  p_business_name text,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  participant_ids uuid[];
  conversation_id uuid;
  business_owner_id uuid;
  canonical_business_name text := p_business_name;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select array_agg(distinct participant_id)
    into participant_ids
  from unnest(coalesce(p_participant_ids, '{}'::uuid[])) as participants(participant_id)
  where participant_id is not null;

  if cardinality(coalesce(p_participant_ids, '{}'::uuid[])) is distinct from 2
     or cardinality(coalesce(participant_ids, '{}'::uuid[])) is distinct from 2
     or not (caller_id = any(participant_ids)) then
    raise exception 'A conversation requires the caller and one recipient'
      using errcode = '42501';
  end if;

  if p_business_id is not null then
    select business.owner_id, business.name
      into business_owner_id, canonical_business_name
    from public.businesses as business
    where business.id = p_business_id
    for share;

    if business_owner_id is null or not (business_owner_id = any(participant_ids)) then
      raise exception 'The current business owner must participate'
        using errcode = '42501';
    end if;
  end if;

  insert into public.conversations (business_id, business_name, initiator_id)
  values (p_business_id, canonical_business_name, caller_id)
  returning id into conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  select conversation_id, participant_id
  from unnest(participant_ids) as participants(participant_id);

  return conversation_id;
end;
$$;

revoke all on function public.create_conversation_with_participants(uuid, text, uuid[])
  from public, anon;
grant execute on function public.create_conversation_with_participants(uuid, text, uuid[])
  to authenticated;

create or replace function public.create_conversation_with_context(
  p_business_id uuid,
  p_business_name text,
  p_participant_ids uuid[],
  p_context_type text,
  p_marketplace_listing_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  participant_ids uuid[];
  conversation_id uuid;
  business_owner_id uuid;
  canonical_business_name text;
  listing_owner_id uuid;
  listing_title text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select array_agg(distinct participant_id order by participant_id)
    into participant_ids
  from unnest(coalesce(p_participant_ids, '{}'::uuid[])) as participants(participant_id)
  where participant_id is not null;

  if cardinality(coalesce(p_participant_ids, '{}'::uuid[])) is distinct from 2
     or cardinality(coalesce(participant_ids, '{}'::uuid[])) is distinct from 2
     or not (caller_id = any(participant_ids)) then
    raise exception 'A conversation requires the caller and one recipient'
      using errcode = '42501';
  end if;

  if p_context_type is null or p_context_type not in ('business', 'marketplace') then
    raise exception 'Invalid conversation context' using errcode = '22023';
  end if;

  if p_context_type = 'business' then
    if p_business_id is null or p_marketplace_listing_id is not null then
      raise exception 'Business conversations require a business and no listing'
        using errcode = '22023';
    end if;

    select business.owner_id, business.name
      into business_owner_id, canonical_business_name
    from public.businesses as business
    where business.id = p_business_id
    for share;

    if business_owner_id is null or not (business_owner_id = any(participant_ids)) then
      raise exception 'The current business owner must participate'
        using errcode = '42501';
    end if;
  else
    if p_business_id is not null or p_marketplace_listing_id is null then
      raise exception 'Marketplace conversations require a listing and no business'
        using errcode = '22023';
    end if;

    select listing.owner_id, listing.title
      into listing_owner_id, listing_title
    from public.marketplace_listings as listing
    where listing.id = p_marketplace_listing_id
    for share;

    if listing_owner_id is null or not (listing_owner_id = any(participant_ids)) then
      raise exception 'The listing owner must participate' using errcode = '42501';
    end if;
  end if;

  select conversation.id
    into conversation_id
  from public.conversations as conversation
  where conversation.closed_at is null
    and conversation.context_type = p_context_type
    and (
      (p_context_type = 'business' and conversation.business_id = p_business_id)
      or (p_context_type = 'marketplace'
        and conversation.marketplace_listing_id = p_marketplace_listing_id)
    )
    and exists (
      select 1 from public.conversation_participants as participant
      where participant.conversation_id = conversation.id
        and participant.user_id = participant_ids[1]
    )
    and exists (
      select 1 from public.conversation_participants as participant
      where participant.conversation_id = conversation.id
        and participant.user_id = participant_ids[2]
    )
    and (
      select count(*)
      from public.conversation_participants as participant
      where participant.conversation_id = conversation.id
    ) = 2
  order by conversation.created_at desc
  limit 1;

  if conversation_id is not null then
    return conversation_id;
  end if;

  insert into public.conversations (
    business_id,
    business_name,
    context_type,
    marketplace_listing_id,
    initiator_id
  )
  values (
    case when p_context_type = 'business' then p_business_id else null end,
    case when p_context_type = 'business'
      then canonical_business_name
      else format('Marketplace: %s [%s]', listing_title, p_marketplace_listing_id)
    end,
    p_context_type,
    case when p_context_type = 'marketplace' then p_marketplace_listing_id else null end,
    caller_id
  )
  returning id into conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  select conversation_id, participant_id
  from unnest(participant_ids) as participants(participant_id);

  return conversation_id;
end;
$$;

revoke all on function public.create_conversation_with_context(uuid, text, uuid[], text, uuid)
  from public, anon;
grant execute on function public.create_conversation_with_context(uuid, text, uuid[], text, uuid)
  to authenticated;

-- Replace the transfer RPCs without the historical-membership INSERTs.
create or replace function public.approve_business_ownership_request(p_request_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_business_id uuid;
  v_new_owner_id uuid;
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'Apenas admins podem aprovar ownership.';
  end if;

  select request.business_id, request.requested_by
    into v_business_id, v_new_owner_id
  from public.owner_claim_requests as request
  where request.id = p_request_id and request.status = 'pending'
  for update;

  if v_business_id is null then
    raise exception 'Solicitação pendente não encontrada.';
  end if;

  update public.businesses
  set owner_id = v_new_owner_id
  where id = v_business_id;

  update public.owner_claim_requests
  set status = 'approved', reviewed_by = v_admin_id, reviewed_at = now()
  where id = p_request_id;

  update public.owner_claim_requests
  set status = 'rejected', reviewed_by = v_admin_id, reviewed_at = now()
  where owner_claim_requests.business_id = v_business_id
    and id <> p_request_id and status = 'pending';

  return true;
end;
$$;

create or replace function public.transfer_business_ownership_by_email(
  p_business_id uuid,
  p_new_owner_email text
)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin_id uuid := auth.uid();
  v_new_owner_id uuid;
begin
  if not public.is_admin(v_admin_id) then
    raise exception 'Apenas admins podem transferir ownership.';
  end if;

  select users.id into v_new_owner_id
  from auth.users as users
  where lower(users.email) = lower(trim(p_new_owner_email))
  limit 1;

  if v_new_owner_id is null then
    raise exception 'Nenhum usuário encontrado com este email.';
  end if;

  if not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'Negócio não encontrado.';
  end if;

  update public.businesses
  set owner_id = v_new_owner_id
  where id = p_business_id;

  update public.owner_claim_requests
  set status = 'approved', reviewed_by = v_admin_id, reviewed_at = now()
  where business_id = p_business_id
    and requested_by = v_new_owner_id
    and status = 'pending';

  update public.owner_claim_requests
  set status = 'rejected', reviewed_by = v_admin_id, reviewed_at = now()
  where business_id = p_business_id
    and requested_by <> v_new_owner_id
    and status = 'pending';

  return true;
end;
$$;

revoke all on function public.approve_business_ownership_request(uuid) from public, anon;
grant execute on function public.approve_business_ownership_request(uuid) to authenticated;
revoke all on function public.transfer_business_ownership_by_email(uuid, text) from public, anon;
grant execute on function public.transfer_business_ownership_by_email(uuid, text) to authenticated;

commit;
