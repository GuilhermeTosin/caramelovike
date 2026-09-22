-- Auditoria de metadados. Executar como administrador no SQL Editor.
-- Nao altera dados, nao lista perfis ou mensagens e nao aplica migrations.
begin transaction read only;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, cmd, policyname;

select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage') and c.relkind in ('r', 'p')
order by 1, 2;

select table_schema, table_name, grantee, privilege_type
from information_schema.table_privileges
where table_schema in ('public', 'storage')
  and grantee in ('PUBLIC', 'anon', 'authenticated')
order by 1, 2, 3, 4;

select table_schema, table_name, column_name, grantee, privilege_type
from information_schema.column_privileges
where table_schema = 'public'
  and grantee in ('PUBLIC', 'anon', 'authenticated')
order by 1, 2, 3, 4, 5;

select c.relname as view_name, pg_get_userbyid(c.relowner) as view_owner,
       c.reloptions, pg_get_viewdef(c.oid, true) as view_definition
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v' and c.relname = 'public_profiles';

select has_table_privilege('anon', 'public.profiles', 'select') as anon_can_select_profiles,
       has_column_privilege('anon', 'public.profiles', 'phone', 'select') as anon_can_select_phone,
       has_column_privilege('anon', 'public.profiles', 'location', 'select') as anon_can_select_location,
       has_table_privilege('anon', 'public.public_profiles', 'select') as anon_can_select_public_profiles,
       has_table_privilege('authenticated', 'public.profiles', 'select') as authenticated_can_select_profiles,
       has_table_privilege('authenticated', 'public.public_profiles', 'select') as authenticated_can_select_public_profiles;

select n.nspname as schema_name, c.relname as table_name, t.tgname as trigger_name,
       t.tgenabled, pg_get_triggerdef(t.oid) as definition,
       p.proname as function_name, pg_get_functiondef(p.oid) as function_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where not t.tgisinternal and n.nspname = 'public'
order by 1, 2, 3;

select n.nspname as schema_name, p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer, p.proconfig as settings, p.proacl as grants,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
order by 1, 2, 3;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
order by id;

select table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'businesses', 'events', 'business_verification_requests',
    'business_reports', 'search_settings', 'featured_placements')
order by table_name, ordinal_position;

rollback;
