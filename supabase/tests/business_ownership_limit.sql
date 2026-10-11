-- Run against a disposable Supabase database after applying migrations:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/business_ownership_limit.sql
-- All fixtures are rolled back. Failures raise an exception.

begin;

insert into auth.users (id, email, raw_user_meta_data) values
  ('c0520000-0000-4000-8000-000000000001', 'business-user@example.invalid', '{}'),
  ('c0520000-0000-4000-8000-000000000002', 'business-editor@example.invalid', '{}');

update public.profiles
set role = 'editor'
where id = 'c0520000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c0520000-0000-4000-8000-000000000001', true);

insert into public.businesses (owner_id, name, slug, category, moderation_status)
values (
  'c0520000-0000-4000-8000-000000000001',
  'Business One',
  'business-one-limit-test',
  'other',
  'pending'
);

do $$
begin
  begin
    insert into public.businesses (owner_id, name, slug, category, moderation_status)
    values (
      'c0520000-0000-4000-8000-000000000001',
      'Business Two',
      'business-two-limit-test',
      'other',
      'pending'
    );
    raise exception 'A standard user created a second active business';
  exception when check_violation then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'c0520000-0000-4000-8000-000000000002', true);

insert into public.businesses (owner_id, name, slug, category, moderation_status)
values
  ('c0520000-0000-4000-8000-000000000002', 'Editor One', 'editor-one-limit-test', 'other', 'pending'),
  ('c0520000-0000-4000-8000-000000000002', 'Editor Two', 'editor-two-limit-test', 'other', 'pending');

rollback;
