-- ============================================
-- SCRIPT PARA CREAR VISTAS LEGACY EN SCHEMA ECOMMERCE
-- Estas vistas mantienen compatibilidad con el código existente
-- ============================================
-- EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- IMPORTANTE: Ejecuta después de crear las tablas del schema ecommerce

-- ============================================
-- ELIMINAR VISTAS EXISTENTES (si existen)
-- ============================================
-- Esto asegura que no haya conflictos al recrear las vistas
DROP VIEW IF EXISTS ecommerce.stores_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.item_options_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.store_items_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.orders_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.component_styles_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.app_themes_legacy CASCADE;
DROP VIEW IF EXISTS ecommerce.app_fonts_legacy CASCADE;

-- ============================================
-- VISTA: stores_legacy
-- ============================================
CREATE VIEW ecommerce.stores_legacy AS
SELECT
  s.id,
  s.subdomain,
  s.store_name,
  s.domain,
  s.is_active,
  s.is_public,
  b.logo_url,
  b.favicon_url,
  b.primary_color,
  b.secondary_color,
  c.contact_email,
  c.contact_phone,
  c.address,
  s.currency_code,
  cs.tax_rate,
  cs.shipping_enabled,
  cs.free_shipping_threshold,
  seo.seo_title,
  seo.seo_description,
  COALESCE(k.seo_keywords, ARRAY[]::varchar[]) AS seo_keywords,
  COALESCE(i.metadata, '{}'::jsonb) AS metadata,
  i.shopify_store_domain,
  i.shopify_access_token,
  s.created_at,
  s.updated_at,
  s.deleted_at
FROM ecommerce.stores s
LEFT JOIN ecommerce.store_branding b ON b.store_id = s.id
LEFT JOIN ecommerce.store_contact c ON c.store_id = s.id
LEFT JOIN ecommerce.store_commerce_settings cs ON cs.store_id = s.id
LEFT JOIN ecommerce.store_seo seo ON seo.store_id = s.id
LEFT JOIN ecommerce.store_integrations i ON i.store_id = s.id
LEFT JOIN (
  SELECT store_id, array_agg(keyword ORDER BY keyword) AS seo_keywords
  FROM ecommerce.store_seo_keywords
  GROUP BY store_id
) k ON k.store_id = s.id;

-- ============================================
-- VISTA: item_options_legacy
-- ============================================
CREATE VIEW ecommerce.item_options_legacy AS
SELECT
  o.id,
  o.item_id,
  o.option_name,
  COALESCE(v.option_values, ARRAY[]::varchar[]) AS option_values,
  o.display_order,
  o.is_required,
  o.created_at
FROM ecommerce.item_options o
LEFT JOIN (
  SELECT option_id, array_agg(value_text ORDER BY display_order, value_text) AS option_values
  FROM ecommerce.item_option_values
  GROUP BY option_id
) v ON v.option_id = o.id;

-- ============================================
-- VISTA: store_items_legacy
-- ============================================
CREATE VIEW ecommerce.store_items_legacy AS
SELECT
  si.id,
  si.item_code,
  si.item_name,
  si.item_description,
  NULL::text AS item_description_html,
  si.category_id,
  si.base_price,
  si.compare_at_price,
  st.currency_code,
  si.is_active,
  si.is_featured,
  si.is_available_for_sale,
  si.track_inventory,
  NULL::int AS inventory_quantity,
  si.low_stock_threshold,
  si.item_slug,
  seo.seo_title,
  seo.seo_description,
  si.metadata,
  COALESCE(t.tags, ARRAY[]::varchar[]) AS tags,
  img.primary_image_url,
  img.primary_image_alt,
  si.display_order,
  COALESCE(m.view_count, 0) AS view_count,
  si.created_at,
  si.updated_at,
  si.store_id
FROM ecommerce.store_items si
JOIN ecommerce.stores st ON st.id = si.store_id
LEFT JOIN ecommerce.item_seo seo ON seo.item_id = si.id
LEFT JOIN ecommerce.item_metrics m ON m.item_id = si.id
LEFT JOIN (
  SELECT item_id, array_agg(tag ORDER BY tag) AS tags
  FROM ecommerce.item_tags
  GROUP BY item_id
) t ON t.item_id = si.id
LEFT JOIN LATERAL (
  SELECT
    ii.image_url AS primary_image_url,
    ii.image_alt AS primary_image_alt
  FROM ecommerce.item_images ii
  WHERE ii.item_id = si.id
  ORDER BY ii.display_order ASC, ii.created_at ASC
  LIMIT 1
) img ON TRUE;

-- ============================================
-- VISTA: orders_legacy
-- ============================================
CREATE VIEW ecommerce.orders_legacy AS
SELECT
  o.id,
  o.order_number,
  o.order_date,
  o.created_at,
  o.status::text AS status,
  CASE WHEN o.user_id IS NULL THEN 'guest' ELSE 'user' END AS customer_type,
  o.user_id,
  o.customer_email,
  ship.first_name AS customer_first_name,
  ship.last_name AS customer_last_name,
  ship.phone AS customer_phone,
  ship.address_line1 AS shipping_address,
  ship.city AS shipping_city,
  ship.postal_code AS shipping_postal_code,
  ship.country AS shipping_country,
  ship.notes AS shipping_notes,
  pay.payment_method,
  pay.payment_status,
  pay.payment_reference,
  o.subtotal,
  o.shipping_cost,
  o.tax_amount,
  o.discount_amount,
  o.total_amount,
  o.currency_code,
  o.notes,
  o.metadata,
  o.confirmed_at,
  o.shipped_at,
  o.delivered_at,
  o.cancelled_at,
  o.updated_at,
  o.store_id
FROM ecommerce.orders o
LEFT JOIN ecommerce.order_addresses ship
  ON ship.order_id = o.id AND ship.addr_type = 'shipping'
LEFT JOIN LATERAL (
  SELECT
    pt.provider AS payment_method,
    pt.status::text AS payment_status,
    pt.provider_txn_id AS payment_reference
  FROM ecommerce.payment_transactions pt
  WHERE pt.order_id = o.id
  ORDER BY pt.created_at DESC
  LIMIT 1
) pay ON TRUE;

-- ============================================
-- VISTA: component_styles_legacy
-- ============================================
CREATE VIEW ecommerce.component_styles_legacy AS
SELECT
  id,
  component_name,
  variables AS style_config,
  store_id,
  true AS is_active,
  NULL::timestamptz AS created_at,
  updated_at
FROM ecommerce.component_styles;

-- ============================================
-- VISTA: app_themes_legacy
-- ============================================
CREATE VIEW ecommerce.app_themes_legacy AS
SELECT
  at.id,
  at.theme_name,
  at.colors AS theme_config,
  atv.store_id,
  COALESCE(atv.is_current, false) AS is_active,
  at.created_at,
  at.updated_at
FROM ecommerce.app_themes at
LEFT JOIN LATERAL (
  SELECT store_id, is_current
  FROM ecommerce.app_theme_versions
  WHERE theme_id = at.id AND is_current = true
  LIMIT 1
) atv ON TRUE;

-- ============================================
-- VISTA: app_fonts_legacy
-- ============================================
CREATE VIEW ecommerce.app_fonts_legacy AS
SELECT
  id,
  font_name,
  css_font_family AS font_family,
  google_font_url AS font_url,
  false AS is_system,
  is_active,
  created_at,
  updated_at,
  NULL::uuid AS store_id
FROM ecommerce.app_fonts;

-- ============================================
-- PERMISOS PARA LAS VISTAS
-- ============================================
-- Otorgar permisos de lectura a los usuarios autenticados
GRANT SELECT ON ecommerce.stores_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.item_options_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.store_items_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.orders_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.component_styles_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.app_themes_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.app_fonts_legacy TO anon, authenticated;

-- ============================================
-- VERIFICACIÓN
-- ============================================
SELECT 
  'Vista' as tipo,
  table_name,
  CASE 
    WHEN table_schema = 'ecommerce' THEN '✅ Creada'
    ELSE '❌ No encontrada'
  END as estado
FROM information_schema.views
WHERE table_schema = 'ecommerce' 
  AND table_name LIKE '%_legacy'
ORDER BY table_name;

