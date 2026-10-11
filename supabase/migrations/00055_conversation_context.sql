begin;

-- Uma conversa precisa manter o contexto que a originou. Sem isso, duas
-- pessoas que ja conversaram sobre um anuncio podem reutilizar o mesmo chat
-- ao iniciar uma conversa direta com o negocio.
alter table public.conversations
  add column if not exists context_type text not null default 'legacy';

alter table public.conversations
  add column if not exists marketplace_listing_id uuid
    references public.marketplace_listings(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'conversations_context_type_check'
      and conrelid = 'public.conversations'::regclass
  ) then
    alter table public.conversations
      add constraint conversations_context_type_check
      check (context_type in ('legacy', 'business', 'marketplace'));
  end if;
end;
$$;

create index if not exists conversations_context_business_idx
  on public.conversations (context_type, business_id, created_at desc);

create index if not exists conversations_context_listing_idx
  on public.conversations (context_type, marketplace_listing_id, created_at desc);

-- A RPC contextualizada valida o dono do recurso e os participantes no banco.
-- A RPC legada continua existindo para que bundles antigos nao percam
-- compatibilidade durante o deploy; eles criam conversas explicitamente legacy.
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
    raise exception 'A conversation requires the caller and one recipient' using errcode = '42501';
  end if;

  if p_context_type is null or p_context_type not in ('business', 'marketplace') then
    raise exception 'Invalid conversation context' using errcode = '22023';
  end if;

  if p_context_type = 'business' then
    if p_business_id is null or p_marketplace_listing_id is not null then
      raise exception 'Business conversations require a business and no listing' using errcode = '22023';
    end if;

    select business.owner_id, business.name
      into business_owner_id, canonical_business_name
    from public.businesses as business
    where business.id = p_business_id;

    if business_owner_id is null or not (business_owner_id = any(participant_ids)) then
      raise exception 'The business owner must participate' using errcode = '42501';
    end if;
  else
    if p_business_id is not null or p_marketplace_listing_id is null then
      raise exception 'Marketplace conversations require a listing and no business' using errcode = '22023';
    end if;

    select listing.owner_id, listing.title
      into listing_owner_id, listing_title
    from public.marketplace_listings as listing
    where listing.id = p_marketplace_listing_id;

    if listing_owner_id is null or not (listing_owner_id = any(participant_ids)) then
      raise exception 'The listing owner must participate' using errcode = '42501';
    end if;
  end if;

  -- Reutiliza a conversa contextual existente quando os dois participantes ja
  -- a possuem; a busca no frontend faz o mesmo antes de chamar esta RPC.
  select conversation.id
    into conversation_id
  from public.conversations as conversation
  where conversation.context_type = p_context_type
    and (
      (p_context_type = 'business' and conversation.business_id = p_business_id)
      or (
        p_context_type = 'marketplace'
        and conversation.marketplace_listing_id = p_marketplace_listing_id
      )
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
    marketplace_listing_id
  )
  values (
    case when p_context_type = 'business' then p_business_id else null end,
    case
      when p_context_type = 'business' then canonical_business_name
      else format('Marketplace: %s [%s]', listing_title, p_marketplace_listing_id)
    end,
    p_context_type,
    case when p_context_type = 'marketplace' then p_marketplace_listing_id else null end
  )
  returning id into conversation_id;

  insert into public.conversation_participants (conversation_id, user_id)
  select conversation_id, participant_id
  from unnest(participant_ids) as participants(participant_id);

  return conversation_id;
end;
$$;

revoke all on function public.create_conversation_with_context(uuid, text, uuid[], text, uuid)
  from public, anon, authenticated;
grant execute on function public.create_conversation_with_context(uuid, text, uuid[], text, uuid)
  to authenticated;

commit;
