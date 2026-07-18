-- The unified /shop adds an "En oferta" filter that must be queryable server-side
-- so it composes with the other getItems filters and stays pagination-friendly.
-- A discount is compare_at_price > base_price, a column-to-column comparison
-- PostgREST cannot express in a filter. Materialize it as a generated column on
-- the base table and surface it through the legacy view the storefront reads, so
-- getItems can filter is_on_sale = true.
begin;

alter table ecommerce.store_items
  add column if not exists is_on_sale boolean
  generated always as (compare_at_price is not null and compare_at_price > base_price) stored;

-- CREATE OR REPLACE preserves the view's grants; security_invoker is re-stated so
-- the storefront RLS posture set on the base view survives the replace. is_on_sale
-- is appended last, the only column change REPLACE allows.
create or replace view ecommerce.store_items_legacy
with (security_invoker = true)
as select
  si.id, si.item_code, si.item_name, si.item_description, si.item_description_html,
  si.category_id, si.base_price, si.compare_at_price, si.currency_code, si.is_active,
  si.is_featured, si.is_available_for_sale, si.track_inventory,
  coalesce(inv.variant_inventory_quantity, si.inventory_quantity, 0) as inventory_quantity,
  si.low_stock_threshold, si.item_slug,
  coalesce(seo.seo_title, si.seo_title) as seo_title,
  coalesce(seo.seo_description, si.seo_description) as seo_description,
  si.metadata,
  coalesce(t.tags, si.tags, array[]::varchar[]) as tags,
  coalesce(img.primary_image_url, si.primary_image_url) as primary_image_url,
  coalesce(img.primary_image_alt, si.primary_image_alt) as primary_image_alt,
  si.display_order,
  coalesce(m.view_count, 0) as view_count,
  si.created_at, si.updated_at, si.store_id, si.is_on_sale
from ecommerce.store_items si
left join ecommerce.item_seo seo on seo.item_id = si.id
left join ecommerce.item_metrics m on m.item_id = si.id
left join (
  select item_id, array_agg(tag order by tag) as tags
  from ecommerce.item_tags
  group by item_id
) t on t.item_id = si.id
left join lateral (
  select sum(inventory_quantity)::integer as variant_inventory_quantity
  from ecommerce.item_variants
  where item_id = si.id
) inv on true
left join lateral (
  select image_url as primary_image_url, image_alt as primary_image_alt
  from ecommerce.item_images
  where item_id = si.id
  order by display_order, created_at
  limit 1
) img on true;

commit;
