-- Marketplace de classificados da comunidade. Os dados antigos de
-- community_finds permanecem intactos e deixam de ser usados pela interface.

create table if not exists public.marketplace_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null check (char_length(trim(name)) between 2 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.marketplace_categories (slug, name, sort_order)
values
  ('eletronicos', 'Eletrônicos', 10),
  ('casa-e-moveis', 'Casa e móveis', 20),
  ('instrumentos-musicais', 'Instrumentos musicais', 30),
  ('roupas-e-acessorios', 'Roupas e acessórios', 40),
  ('bebes-e-criancas', 'Bebês e crianças', 50),
  ('esportes-e-lazer', 'Esportes e lazer', 60),
  ('automoveis-e-acessorios', 'Automóveis e acessórios', 70),
  ('ferramentas', 'Ferramentas', 80),
  ('livros', 'Livros', 90),
  ('produtos-brasileiros', 'Produtos brasileiros', 100),
  ('beleza-e-cuidados-pessoais', 'Beleza e cuidados pessoais', 110),
  ('outros', 'Outros', 120)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  listing_type text not null default 'selling' check (listing_type in ('selling', 'wanted', 'giving_away')),
  category_id uuid not null references public.marketplace_categories(id),
  title text not null check (char_length(trim(title)) between 3 and 140),
  description text not null check (char_length(trim(description)) between 10 and 5000),
  price numeric(12,2) check (price is null or price >= 0),
  currency text not null default 'CAD' check (currency ~ '^[A-Z]{3}$'),
  condition text check (condition is null or condition in ('new', 'like_new', 'good', 'used', 'parts')),
  country_code text not null check (country_code ~ '^[a-zA-Z]{2}$'),
  state_code text not null check (char_length(trim(state_code)) between 1 and 12),
  city text not null check (char_length(trim(city)) between 2 and 100),
  neighborhood text check (neighborhood is null or char_length(trim(neighborhood)) between 1 and 100),
  lat double precision check (lat is null or lat between -90 and 90),
  lng double precision check (lng is null or lng between -180 and 180),
  slug text not null check (slug ~ '^[a-z0-9-]+$'),
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'sold', 'expired', 'removed')),
  view_count integer not null default 0 check (view_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, slug)
);

create table if not exists public.marketplace_listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_favorites (
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

create table if not exists public.marketplace_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.marketplace_listings(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null check (reason in ('fraud', 'prohibited', 'spam', 'duplicate', 'misleading', 'offensive', 'other')),
  details text,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

create index if not exists marketplace_listings_active_created_idx on public.marketplace_listings (status, created_at desc);
create index if not exists marketplace_listings_location_idx on public.marketplace_listings (country_code, state_code, city, status);
create index if not exists marketplace_listings_category_idx on public.marketplace_listings (category_id, status, created_at desc);
create index if not exists marketplace_listings_owner_idx on public.marketplace_listings (owner_id, status, updated_at desc);
create index if not exists marketplace_images_listing_idx on public.marketplace_listing_images (listing_id, sort_order);
create index if not exists marketplace_reports_status_idx on public.marketplace_reports (status, created_at desc);

drop trigger if exists trg_marketplace_listings_updated_at on public.marketplace_listings;
create trigger trg_marketplace_listings_updated_at before update on public.marketplace_listings
for each row execute function public.set_updated_at();

-- A primeira barreira contra anúncios evidentemente ilegais ou proibidos.
-- A moderação administrativa continua sendo necessária para casos de contexto.
create or replace function public.prevent_marketplace_prohibited_content()
returns trigger
language plpgsql
as $$
declare
  searchable text := lower(coalesce(new.title, '') || ' ' || coalesce(new.description, ''));
begin
  if searchable ~ '\m(arma|armas|municao|municoes|munição|munições|cocaina|cocaína|heroina|heroína|fentanil|pornografia|falsificado|falsificados|produto roubado|produtos roubados)\M' then
    raise exception 'Este anúncio contém conteúdo não permitido no Marketplace.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_marketplace_prohibited_content on public.marketplace_listings;
create trigger trg_marketplace_prohibited_content
before insert or update of title, description on public.marketplace_listings
for each row execute function public.prevent_marketplace_prohibited_content();

alter table public.marketplace_categories enable row level security;
alter table public.marketplace_listings enable row level security;
alter table public.marketplace_listing_images enable row level security;
alter table public.marketplace_favorites enable row level security;
alter table public.marketplace_reports enable row level security;

drop policy if exists marketplace_categories_public_read on public.marketplace_categories;
create policy marketplace_categories_public_read on public.marketplace_categories for select to anon, authenticated using (is_active = true);

drop policy if exists marketplace_listings_public_read on public.marketplace_listings;
create policy marketplace_listings_public_read on public.marketplace_listings for select to anon, authenticated using (status = 'active' or auth.uid() = owner_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists marketplace_listings_owner_insert on public.marketplace_listings;
create policy marketplace_listings_owner_insert on public.marketplace_listings for insert to authenticated with check (auth.uid() = owner_id);
drop policy if exists marketplace_listings_owner_update on public.marketplace_listings;
create policy marketplace_listings_owner_update on public.marketplace_listings for update to authenticated using (auth.uid() = owner_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (auth.uid() = owner_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
drop policy if exists marketplace_listings_owner_delete on public.marketplace_listings;
create policy marketplace_listings_owner_delete on public.marketplace_listings for delete to authenticated using (auth.uid() = owner_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists marketplace_images_public_read on public.marketplace_listing_images;
create policy marketplace_images_public_read on public.marketplace_listing_images for select to anon, authenticated using (exists (select 1 from public.marketplace_listings l where l.id = listing_id and (l.status = 'active' or l.owner_id = auth.uid())));
drop policy if exists marketplace_images_owner_manage on public.marketplace_listing_images;
create policy marketplace_images_owner_manage on public.marketplace_listing_images for all to authenticated using (exists (select 1 from public.marketplace_listings l where l.id = listing_id and (l.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')))) with check (exists (select 1 from public.marketplace_listings l where l.id = listing_id and (l.owner_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))));

drop policy if exists marketplace_favorites_owner_read on public.marketplace_favorites;
create policy marketplace_favorites_owner_read on public.marketplace_favorites for select to authenticated using (auth.uid() = user_id);
drop policy if exists marketplace_favorites_owner_insert on public.marketplace_favorites;
create policy marketplace_favorites_owner_insert on public.marketplace_favorites for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists marketplace_favorites_owner_delete on public.marketplace_favorites;
create policy marketplace_favorites_owner_delete on public.marketplace_favorites for delete to authenticated using (auth.uid() = user_id);

drop policy if exists marketplace_reports_auth_insert on public.marketplace_reports;
create policy marketplace_reports_auth_insert on public.marketplace_reports for insert to authenticated with check (auth.uid() = reporter_id);
drop policy if exists marketplace_reports_admin_manage on public.marketplace_reports;
create policy marketplace_reports_admin_manage on public.marketplace_reports for all to authenticated using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

grant select on public.marketplace_categories, public.marketplace_listings, public.marketplace_listing_images to anon, authenticated;
grant insert, update, delete on public.marketplace_listings, public.marketplace_listing_images to authenticated;
grant select, insert, delete on public.marketplace_favorites to authenticated;
grant select, insert on public.marketplace_reports to authenticated;

-- Fotos do Marketplace usam o bucket público já existente, mas o caminho é
-- restrito ao proprietário autenticado para impedir uploads em nome de outro usuário.
drop policy if exists marketplace_storage_owner_insert on storage.objects;
create policy marketplace_storage_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'business-images' and name like ('marketplace/' || auth.uid()::text || '/%'));
drop policy if exists marketplace_storage_owner_update on storage.objects;
create policy marketplace_storage_owner_update on storage.objects for update to authenticated
using (bucket_id = 'business-images' and name like ('marketplace/' || auth.uid()::text || '/%'))
with check (bucket_id = 'business-images' and name like ('marketplace/' || auth.uid()::text || '/%'));
drop policy if exists marketplace_storage_owner_delete on storage.objects;
create policy marketplace_storage_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'business-images' and name like ('marketplace/' || auth.uid()::text || '/%'));
