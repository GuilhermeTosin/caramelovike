alter table public.marketplace_listings
  add column if not exists keywords text[] not null default '{}'::text[],
  add column if not exists video_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.marketplace_listings'::regclass
      and conname = 'marketplace_listings_video_url_check'
  ) then
    alter table public.marketplace_listings
      add constraint marketplace_listings_video_url_check
      check (video_url is null or video_url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/');
  end if;
end $$;

create index if not exists marketplace_listings_keywords_idx
  on public.marketplace_listings using gin (keywords);
