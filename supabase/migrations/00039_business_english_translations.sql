-- Optional English public description. Portuguese remains the canonical and required listing language.
alter table public.businesses
  add column if not exists description_en text;

comment on column public.businesses.description_en is 'Optional English public description. When absent, no English business page is published.';