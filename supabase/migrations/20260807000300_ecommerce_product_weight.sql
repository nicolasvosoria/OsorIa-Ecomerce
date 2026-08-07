-- Weight follows the repo's own base_price/price convention: store_items.weight_grams
-- is the base and item_variants.weight_grams is a nullable override, resolved the same
-- way a variant's price already overrides the product's base_price. Both columns stay
-- nullable so the existing catalog keeps working; a later shipping screen surfaces the
-- products still missing one before a weight-based rate can be activated.
--
-- The unit is grams, stored as an integer: lossless, no float drift across rate-ladder
-- comparisons, and it converts trivially to the kilograms Colombian carrier aggregators
-- quote in. Named non-negativity check constraints match this schema's own precedent
-- (the product_combos tables), so a future contract check can assert them by name.
begin;

alter table ecommerce.store_items
  add column if not exists weight_grams integer
  constraint store_items_weight_grams_nonnegative_chk check (weight_grams >= 0);

alter table ecommerce.item_variants
  add column if not exists weight_grams integer
  constraint item_variants_weight_grams_nonnegative_chk check (weight_grams >= 0);

-- store_items_legacy is what every product read (storefront and admin) actually
-- selects from, so weight_grams has to be appended here too or it is unreachable data.
-- CREATE OR REPLACE preserves the view's grants; security_invoker is re-stated so the
-- storefront RLS posture set on the base view survives the replace. weight_grams is
-- appended last, the only column change REPLACE allows.
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
  si.created_at, si.updated_at, si.store_id, si.is_on_sale, si.weight_grams
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
