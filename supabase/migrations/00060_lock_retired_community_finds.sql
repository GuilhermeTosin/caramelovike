begin;

-- Community Finds is retired in the product. Keep its empty legacy tables for
-- now, but remove all direct PostgREST access from client-facing roles.
revoke all privileges on table
  public.community_finds,
  public.community_find_votes,
  public.community_find_messages,
  public.community_find_reports
from public, anon, authenticated;

-- These routines only support the retired client feature. Trigger behavior is
-- unaffected by revoking direct EXECUTE privileges.
revoke all privileges on function public.vote_community_find(uuid, smallint)
  from public, anon, authenticated;
revoke all privileges on function public.recompute_community_find_votes(uuid)
  from public, anon, authenticated;
revoke all privileges on function public.on_community_find_vote_change()
  from public, anon, authenticated;

commit;
