-- Categories are reachable at /catalog/<slug>, but the slug was derived per request
-- from category_name (generateCategorySlug), never stored. With no CRUD nobody could
-- rename a category, so the derivation held. The category CRUD added alongside this
-- migration makes a rename one click away, and a derived slug would silently rewrite
-- the public URL and break every indexed link. Persist the slug instead, and give
-- categories the seo_title/seo_description that store_items and product_combos
-- already have. Grants on item_categories are table-level, so the new columns
-- inherit them.
begin;

alter table ecommerce.item_categories
  add column if not exists slug varchar,
  add column if not exists seo_title varchar,
  add column if not exists seo_description text;

-- Mirrors generateCategorySlug (lib/utils/category-slug.ts) step for step: lower,
-- NFD, drop combining marks, non-alphanumerics to dashes, trim dashes. The two mark
-- classes are not equivalent in general: generateCategorySlug uses \p{Diacritic},
-- which also spans marks outside the range used here ([\u0300-\u036f], Combining
-- Diacritical Marks). They do agree on every mark an NFD-decomposed Spanish name
-- yields -- the five accents, the tilde of n-tilde, and the diaeresis of u-umlaut
-- (pinguino, verguenza, bilingue) -- which is what the stored slugs are made of.
-- Divergence on that range moves a live URL, which is exactly what this migration
-- exists to prevent.
update ecommerce.item_categories
set slug = trim(both '-' from regexp_replace(
      regexp_replace(normalize(lower(category_name), NFD), '[\u0300-\u036f]', '', 'g'),
      '[^a-z0-9]+', '-', 'g'))
where slug is null;

-- A name of only punctuation normalizes to an empty slug, and two names can
-- normalize to the same one. Either would surface as a raw 23505 on the unique
-- below, or as an unreachable category. Fail with the offending rows named.
do $$
declare
  v_empty text[];
  v_duplicated text[];
begin
  select array_agg(format('%s (store %s)', category_name, store_id) order by category_name)
    into v_empty
  from ecommerce.item_categories
  where slug is null or slug = '';

  if v_empty is not null then
    raise exception 'Categories whose name yields no slug: %', array_to_string(v_empty, ', ');
  end if;

  select array_agg(entry order by entry) into v_duplicated
  from (
    select format('%s (store %s)', slug, store_id) as entry
    from ecommerce.item_categories
    group by store_id, slug
    having count(*) > 1
  ) duplicates;

  if v_duplicated is not null then
    raise exception 'Categories sharing a slug within a store: %', array_to_string(v_duplicated, ', ');
  end if;
end $$;

alter table ecommerce.item_categories
  alter column slug set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'item_categories_store_id_slug_key') then
    alter table ecommerce.item_categories
      add constraint item_categories_store_id_slug_key unique (store_id, slug);
  end if;
end $$;

commit;
