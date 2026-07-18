-- Drop the two compatibility views that NO application code reads anymore, per the
-- 2026 legacy-usage audit against the codebase:
--   * orders_legacy      — orders are read from the `orders` table (orders-api /
--                          stats-api); tests assert this view is NOT used.
--   * app_themes_legacy   — themes-api reads the `app_themes` table + `stores_legacy`,
--                          never this view.
-- Keeps the new project's `ecommerce` schema clean of dead legacy. The remaining
-- *_legacy views are still read by the app and stay. store_items_legacy and
-- item_options_legacy also look dead-adjacent but sit in the in-flight products-api
-- /shop read refactor, so they are intentionally NOT dropped here — re-audit after
-- that refactor lands.
--
-- Paired change: supabase/checks/verify-ecommerce-contract.sql drops these two from
-- its required-views assertion (they had no column-level asserts).

drop view if exists ecommerce.orders_legacy;
drop view if exists ecommerce.app_themes_legacy;
