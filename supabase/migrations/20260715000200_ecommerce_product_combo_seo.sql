-- Reachable SEO for combos. /products/[slug] already renders combos (getItemBySlug
-- falls back to getComboBySlug) and its generateMetadata reads seo_title/seo_description,
-- but product_combos had no such columns, so comboToStoreItem invented them from the
-- combo name. Additive and nullable: no backfill, no rewrite, existing rows keep the
-- name/description fallback that comboToStoreItem still applies when these are empty.
-- Grants on product_combos are table-level, so the new columns inherit them.
begin;

alter table ecommerce.product_combos
  add column if not exists seo_title varchar,
  add column if not exists seo_description text;

-- product_combos.slug is unique per store, but product slugs live in
-- ecommerce.store_items.item_slug, so no constraint can span both tables.
-- getItemBySlug resolves products first, so a combo sharing a product's slug is
-- silently unreachable. New saves are now rejected in combos-api; surface the
-- pre-existing ones here without failing the deploy.
do $$
declare
  v_unreachable text[];
begin
  select array_agg(format('%s (store %s)', pc.slug, pc.store_id) order by pc.slug)
    into v_unreachable
  from ecommerce.product_combos pc
  join ecommerce.store_items si
    on si.store_id = pc.store_id and si.item_slug = pc.slug;

  if v_unreachable is not null then
    raise notice 'Combos unreachable because a product owns the same slug: %',
      array_to_string(v_unreachable, ', ');
  end if;
end $$;

commit;
