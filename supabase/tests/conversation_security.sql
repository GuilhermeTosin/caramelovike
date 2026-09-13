-- Run against a disposable Supabase database after applying migrations:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/conversation_security.sql
-- All fixtures are rolled back. Failures raise an exception.
begin;

create function pg_temp.expect_denied(statement text) returns void
language plpgsql as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'Expected permission denial: %', statement;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('c0510000-0000-4000-8000-000000000001', 'conversation-a@example.invalid', '{}'),
  ('c0510000-0000-4000-8000-000000000002', 'conversation-b@example.invalid', '{}'),
  ('c0510000-0000-4000-8000-000000000003', 'conversation-c@example.invalid', '{}');

set local role anon;
select pg_temp.expect_denied($sql$
  select public.create_conversation_with_participants(null, 'test', array[
    'c0510000-0000-4000-8000-000000000001'::uuid,
    'c0510000-0000-4000-8000-000000000002'::uuid])
$sql$);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0510000-0000-4000-8000-000000000001', true);
select set_config('test.conversation_id', public.create_conversation_with_participants(
  null, 'Security regression', array[
    'c0510000-0000-4000-8000-000000000001'::uuid,
    'c0510000-0000-4000-8000-000000000002'::uuid])::text, true);

select pg_temp.expect_denied($sql$
  select public.create_conversation_with_participants(null, 'invalid', array[
    'c0510000-0000-4000-8000-000000000002'::uuid,
    'c0510000-0000-4000-8000-000000000003'::uuid])
$sql$);
select pg_temp.expect_denied($sql$
  select public.create_conversation_with_participants(null, 'invalid', null)
$sql$);
select pg_temp.expect_denied($sql$
  select public.create_conversation_with_participants(null, 'invalid', array[
    'c0510000-0000-4000-8000-000000000001'::uuid,
    'c0510000-0000-4000-8000-000000000001'::uuid])
$sql$);

insert into public.messages (conversation_id, sender_id, text)
values (current_setting('test.conversation_id')::uuid, auth.uid(), 'Original message');

select pg_temp.expect_denied($sql$
  insert into public.conversations (business_name) values ('Bypass RPC')
$sql$);
select pg_temp.expect_denied($sql$
  update public.conversations set last_message = 'Forged summary'
  where id = current_setting('test.conversation_id')::uuid
$sql$);
do $$
declare changed integer;
begin
  update public.messages set read = true where conversation_id = current_setting('test.conversation_id')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Sender marked their own message as read'; end if;
end;
$$;

do $$
begin
  if not exists (select 1 from public.conversations
    where id = current_setting('test.conversation_id')::uuid
      and last_message = 'Original message' and last_message_at is not null) then
    raise exception 'Message summary was not updated';
  end if;
end;
$$;

-- Even an existing participant cannot invite an arbitrary third party.
select pg_temp.expect_denied($sql$
  insert into public.conversation_participants values (
    current_setting('test.conversation_id')::uuid,
    'c0510000-0000-4000-8000-000000000003')
$sql$);

select set_config('request.jwt.claim.sub', 'c0510000-0000-4000-8000-000000000003', true);
select pg_temp.expect_denied($sql$
  insert into public.conversation_participants values (
    current_setting('test.conversation_id')::uuid, auth.uid())
$sql$);
select pg_temp.expect_denied($sql$
  insert into public.messages (conversation_id, sender_id, text) values (
    current_setting('test.conversation_id')::uuid, auth.uid(), 'Intrusion')
$sql$);
do $$
declare changed integer;
begin
  if exists (select 1 from public.messages where conversation_id = current_setting('test.conversation_id')::uuid)
     or exists (select 1 from public.conversations where id = current_setting('test.conversation_id')::uuid)
     or exists (select 1 from public.conversation_participants where conversation_id = current_setting('test.conversation_id')::uuid) then
    raise exception 'Outsider can read private conversation data';
  end if;
  update public.messages set read = true where conversation_id = current_setting('test.conversation_id')::uuid;
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Outsider updated a read receipt'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c0510000-0000-4000-8000-000000000002', true);
select pg_temp.expect_denied($sql$
  update public.messages set text = 'Forged' where conversation_id = current_setting('test.conversation_id')::uuid
$sql$);
select pg_temp.expect_denied($sql$
  update public.messages set sender_id = auth.uid() where conversation_id = current_setting('test.conversation_id')::uuid
$sql$);
select pg_temp.expect_denied($sql$
  update public.messages set conversation_id = gen_random_uuid() where conversation_id = current_setting('test.conversation_id')::uuid
$sql$);
select pg_temp.expect_denied($sql$
  insert into public.messages (conversation_id, sender_id, text) values (
    current_setting('test.conversation_id')::uuid, 'c0510000-0000-4000-8000-000000000001', 'Spoofed')
$sql$);

do $$
declare changed integer;
begin
  update public.messages set read = true where conversation_id = current_setting('test.conversation_id')::uuid;
  get diagnostics changed = row_count;
  if changed <> 1 then raise exception 'Recipient could not mark the message as read'; end if;
end;
$$;
select pg_temp.expect_denied($sql$
  update public.messages set read = false where conversation_id = current_setting('test.conversation_id')::uuid
$sql$);

-- Trusted ownership-transfer code still needs to add a participant.
reset role;
set local role service_role;
insert into public.conversation_participants values (
  current_setting('test.conversation_id')::uuid, 'c0510000-0000-4000-8000-000000000003');
reset role;

rollback;
