update public.marketplace_categories
set sort_order = 130
where slug = 'outros';

insert into public.marketplace_categories (slug, name, sort_order, is_active)
values ('vagas-de-emprego', 'Vagas de emprego', 120, true)
on conflict (slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true;
