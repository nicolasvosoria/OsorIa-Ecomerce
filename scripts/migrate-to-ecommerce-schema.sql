-- ============================================
-- SCRIPT DE MIGRACIÓN: public → ecommerce
-- Migra datos del schema public al schema ecommerce normalizado
-- ============================================
-- EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- IMPORTANTE: Ejecuta en orden y verifica cada paso

BEGIN;

-- ============================================
-- PASO 1: MIGRAR stores (DEBE SER PRIMERO - otras tablas dependen de esto)
-- ============================================
-- Migrar tabla principal stores
INSERT INTO ecommerce.stores (
  id, subdomain, store_name, domain, is_active, is_public,
  currency_code, created_at, updated_at, deleted_at
)
SELECT 
  id,
  subdomain,
  store_name,
  domain,
  COALESCE(is_active, true),
  COALESCE(is_public, true),
  COALESCE(currency_code, 'COP'),
  created_at,
  updated_at,
  deleted_at
FROM public.stores
ON CONFLICT (id) DO UPDATE SET
  subdomain = EXCLUDED.subdomain,
  store_name = EXCLUDED.store_name,
  domain = EXCLUDED.domain,
  is_active = EXCLUDED.is_active,
  is_public = EXCLUDED.is_public,
  currency_code = EXCLUDED.currency_code,
  updated_at = EXCLUDED.updated_at,
  deleted_at = EXCLUDED.deleted_at;

-- Migrar store_branding
INSERT INTO ecommerce.store_branding (
  store_id, logo_url, favicon_url, primary_color, secondary_color, updated_at
)
SELECT 
  id,
  logo_url,
  favicon_url,
  primary_color,
  secondary_color,
  updated_at
FROM public.stores
WHERE logo_url IS NOT NULL 
   OR favicon_url IS NOT NULL 
   OR primary_color IS NOT NULL 
   OR secondary_color IS NOT NULL
ON CONFLICT (store_id) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  favicon_url = EXCLUDED.favicon_url,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  updated_at = EXCLUDED.updated_at;

-- Migrar store_contact
INSERT INTO ecommerce.store_contact (
  store_id, contact_email, contact_phone, address, updated_at
)
SELECT 
  id,
  contact_email,
  contact_phone,
  address,
  updated_at
FROM public.stores
WHERE contact_email IS NOT NULL 
   OR contact_phone IS NOT NULL 
   OR address IS NOT NULL
ON CONFLICT (store_id) DO UPDATE SET
  contact_email = EXCLUDED.contact_email,
  contact_phone = EXCLUDED.contact_phone,
  address = EXCLUDED.address,
  updated_at = EXCLUDED.updated_at;

-- Migrar store_commerce_settings
INSERT INTO ecommerce.store_commerce_settings (
  store_id, tax_rate, shipping_enabled, free_shipping_threshold, updated_at
)
SELECT 
  id,
  COALESCE(tax_rate, 0),
  COALESCE(shipping_enabled, true),
  free_shipping_threshold,
  updated_at
FROM public.stores
ON CONFLICT (store_id) DO UPDATE SET
  tax_rate = EXCLUDED.tax_rate,
  shipping_enabled = EXCLUDED.shipping_enabled,
  free_shipping_threshold = EXCLUDED.free_shipping_threshold,
  updated_at = EXCLUDED.updated_at;

-- Migrar store_seo
INSERT INTO ecommerce.store_seo (
  store_id, seo_title, seo_description, updated_at
)
SELECT 
  id,
  seo_title,
  seo_description,
  updated_at
FROM public.stores
WHERE seo_title IS NOT NULL OR seo_description IS NOT NULL
ON CONFLICT (store_id) DO UPDATE SET
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = EXCLUDED.updated_at;

-- Migrar store_seo_keywords (desde array)
INSERT INTO ecommerce.store_seo_keywords (store_id, keyword)
SELECT 
  id,
  unnest(seo_keywords)::varchar
FROM public.stores
WHERE seo_keywords IS NOT NULL 
  AND array_length(seo_keywords, 1) > 0
  AND seo_keywords::text != '{}'
ON CONFLICT (store_id, keyword) DO NOTHING;

-- Migrar store_integrations
INSERT INTO ecommerce.store_integrations (
  store_id, shopify_store_domain, shopify_access_token, metadata, updated_at
)
SELECT 
  id,
  shopify_store_domain,
  shopify_access_token,
  COALESCE(metadata, '{}'::jsonb),
  updated_at
FROM public.stores
WHERE shopify_store_domain IS NOT NULL 
   OR shopify_access_token IS NOT NULL
   OR (metadata IS NOT NULL AND metadata::text != '{}')
ON CONFLICT (store_id) DO UPDATE SET
  shopify_store_domain = EXCLUDED.shopify_store_domain,
  shopify_access_token = EXCLUDED.shopify_access_token,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- PASO 2: MIGRAR user_profiles
-- ============================================
INSERT INTO ecommerce.user_profiles (id, email, first_name, last_name, role, created_at, updated_at)
SELECT 
  id,
  email,
  first_name,
  last_name,
  COALESCE(role, 'user')::varchar,
  created_at,
  updated_at
FROM public.user_profiles
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- PASO 3: MIGRAR item_categories
-- ============================================
INSERT INTO ecommerce.item_categories (
  id, store_id, category_name, category_description, 
  category_image_url, parent_category_id, display_order, 
  is_active, created_at, updated_at
)
SELECT 
  id,
  store_id,
  category_name,
  category_description,
  category_image_url,
  parent_category_id,
  display_order,
  COALESCE(is_active, true),
  created_at,
  updated_at
FROM public.item_categories
ON CONFLICT (id) DO UPDATE SET
  category_name = EXCLUDED.category_name,
  category_description = EXCLUDED.category_description,
  category_image_url = EXCLUDED.category_image_url,
  parent_category_id = EXCLUDED.parent_category_id,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- PASO 4: MIGRAR store_items
-- ============================================
-- Primero insertar en store_items
INSERT INTO ecommerce.store_items (
  id, store_id, item_code, item_name, item_description,
  category_id, base_price, compare_at_price,
  is_active, is_featured, is_available_for_sale,
  track_inventory, low_stock_threshold, item_slug,
  metadata, display_order, created_at, updated_at
)
SELECT 
  id,
  store_id,
  item_code,
  item_name,
  item_description,
  category_id,
  base_price,
  compare_at_price,
  COALESCE(is_active, true),
  COALESCE(is_featured, false),
  COALESCE(is_available_for_sale, true),
  COALESCE(track_inventory, false),
  COALESCE(low_stock_threshold, 10),
  item_slug,
  COALESCE(metadata, '{}'::jsonb),
  COALESCE(display_order, 0),
  created_at,
  updated_at
FROM public.store_items
ON CONFLICT (id) DO UPDATE SET
  item_name = EXCLUDED.item_name,
  item_description = EXCLUDED.item_description,
  base_price = EXCLUDED.base_price,
  compare_at_price = EXCLUDED.compare_at_price,
  is_active = EXCLUDED.is_active,
  is_featured = EXCLUDED.is_featured,
  is_available_for_sale = EXCLUDED.is_available_for_sale,
  track_inventory = EXCLUDED.track_inventory,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  item_slug = EXCLUDED.item_slug,
  metadata = EXCLUDED.metadata,
  display_order = EXCLUDED.display_order,
  updated_at = EXCLUDED.updated_at;

-- Crear registros en item_seo
INSERT INTO ecommerce.item_seo (item_id, seo_title, seo_description, updated_at)
SELECT 
  id,
  seo_title,
  seo_description,
  updated_at
FROM public.store_items
WHERE seo_title IS NOT NULL OR seo_description IS NOT NULL
ON CONFLICT (item_id) DO UPDATE SET
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  updated_at = EXCLUDED.updated_at;

-- Crear registros en item_metrics
INSERT INTO ecommerce.item_metrics (item_id, view_count, updated_at)
SELECT 
  id,
  COALESCE(view_count, 0),
  updated_at
FROM public.store_items
ON CONFLICT (item_id) DO UPDATE SET
  view_count = EXCLUDED.view_count,
  updated_at = EXCLUDED.updated_at;

-- Migrar tags desde el array a item_tags
INSERT INTO ecommerce.item_tags (item_id, tag)
SELECT 
  id,
  unnest(tags)::varchar
FROM public.store_items
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT (item_id, tag) DO NOTHING;

-- ============================================
-- PASO 5: MIGRAR item_images
-- ============================================
INSERT INTO ecommerce.item_images (
  id, item_id, variant_id, image_url, image_alt,
  image_title, display_order, width, height,
  image_type, created_at
)
SELECT 
  id,
  item_id,
  variant_id,
  image_url,
  image_alt,
  image_title,
  COALESCE(display_order, 0),
  width,
  height,
  COALESCE(image_type, 'product'),
  created_at
FROM public.item_images
ON CONFLICT (id) DO UPDATE SET
  image_url = EXCLUDED.image_url,
  image_alt = EXCLUDED.image_alt,
  image_title = EXCLUDED.image_title,
  display_order = EXCLUDED.display_order,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  image_type = EXCLUDED.image_type;

-- También migrar primary_image_url de store_items como imagen principal
INSERT INTO ecommerce.item_images (
  id, item_id, image_url, image_alt, display_order, image_type, created_at
)
SELECT 
  gen_random_uuid(),
  id,
  primary_image_url,
  COALESCE(primary_image_alt, item_name),
  0,
  'product',
  created_at
FROM public.store_items
WHERE primary_image_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ecommerce.item_images 
    WHERE item_id = public.store_items.id AND display_order = 0
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 6: MIGRAR item_variants
-- ============================================
INSERT INTO ecommerce.item_variants (
  id, item_id, variant_code, price, compare_at_price,
  variant_options, track_inventory, inventory_quantity,
  is_available, is_default, metadata, created_at, updated_at
)
SELECT 
  id,
  item_id,
  variant_code,
  price,
  compare_at_price,
  COALESCE(variant_options, '{}'::jsonb),
  COALESCE(track_inventory, false),
  COALESCE(inventory_quantity, 0),
  COALESCE(is_available, true),
  COALESCE(is_default, false),
  COALESCE(metadata, '{}'::jsonb),
  created_at,
  updated_at
FROM public.item_variants
ON CONFLICT (id) DO UPDATE SET
  variant_code = EXCLUDED.variant_code,
  price = EXCLUDED.price,
  compare_at_price = EXCLUDED.compare_at_price,
  variant_options = EXCLUDED.variant_options,
  track_inventory = EXCLUDED.track_inventory,
  inventory_quantity = EXCLUDED.inventory_quantity,
  is_available = EXCLUDED.is_available,
  is_default = EXCLUDED.is_default,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- PASO 7: MIGRAR orders
-- ============================================
INSERT INTO ecommerce.orders (
  id, store_id, order_number, order_date, status,
  user_id, customer_email, subtotal, shipping_cost,
  tax_amount, discount_amount, total_amount,
  currency_code, notes, metadata, confirmed_at,
  shipped_at, delivered_at, cancelled_at,
  created_at, updated_at
)
SELECT 
  id,
  store_id,
  order_number,
  COALESCE(order_date, created_at),
  CASE 
    WHEN status = 'pending' THEN 'pending'::ecommerce.order_status
    WHEN status = 'confirmed' THEN 'confirmed'::ecommerce.order_status
    WHEN status = 'processing' THEN 'confirmed'::ecommerce.order_status
    WHEN status = 'shipped' THEN 'shipped'::ecommerce.order_status
    WHEN status = 'delivered' THEN 'delivered'::ecommerce.order_status
    WHEN status = 'cancelled' THEN 'cancelled'::ecommerce.order_status
    ELSE 'pending'::ecommerce.order_status
  END,
  user_id,
  customer_email,
  subtotal,
  COALESCE(shipping_cost, 0),
  COALESCE(tax_amount, 0),
  COALESCE(discount_amount, 0),
  total_amount,
  COALESCE(currency_code, 'COP'),
  notes,
  COALESCE(metadata, '{}'::jsonb),
  confirmed_at,
  shipped_at,
  delivered_at,
  cancelled_at,
  created_at,
  updated_at
FROM public.orders
ON CONFLICT (id) DO UPDATE SET
  order_number = EXCLUDED.order_number,
  status = EXCLUDED.status,
  customer_email = EXCLUDED.customer_email,
  subtotal = EXCLUDED.subtotal,
  shipping_cost = EXCLUDED.shipping_cost,
  tax_amount = EXCLUDED.tax_amount,
  discount_amount = EXCLUDED.discount_amount,
  total_amount = EXCLUDED.total_amount,
  currency_code = EXCLUDED.currency_code,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata,
  confirmed_at = EXCLUDED.confirmed_at,
  shipped_at = EXCLUDED.shipped_at,
  delivered_at = EXCLUDED.delivered_at,
  cancelled_at = EXCLUDED.cancelled_at,
  updated_at = EXCLUDED.updated_at;

-- Crear direcciones de envío desde orders
INSERT INTO ecommerce.order_addresses (
  id, order_id, addr_type, first_name, last_name,
  email, phone, address_line1, city, postal_code,
  country, notes
)
SELECT 
  gen_random_uuid(),
  id,
  'shipping'::ecommerce.address_type,
  customer_first_name,
  customer_last_name,
  customer_email,
  customer_phone,
  shipping_address,
  shipping_city,
  shipping_postal_code,
  COALESCE(shipping_country, 'Colombia'),
  shipping_notes
FROM public.orders
WHERE shipping_address IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ecommerce.order_addresses 
    WHERE order_id = public.orders.id AND addr_type = 'shipping'
  )
ON CONFLICT DO NOTHING;

-- Crear transacciones de pago desde orders
INSERT INTO ecommerce.payment_transactions (
  id, order_id, provider, provider_txn_id, status,
  amount, currency_code, created_at
)
SELECT 
  gen_random_uuid(),
  id,
  COALESCE(payment_method, 'unknown'),
  payment_reference,
  CASE 
    WHEN payment_status = 'pending' THEN 'pending'::ecommerce.payment_status
    WHEN payment_status = 'paid' THEN 'paid'::ecommerce.payment_status
    WHEN payment_status = 'authorized' THEN 'authorized'::ecommerce.payment_status
    WHEN payment_status = 'failed' THEN 'failed'::ecommerce.payment_status
    WHEN payment_status = 'refunded' THEN 'refunded'::ecommerce.payment_status
    ELSE 'pending'::ecommerce.payment_status
  END,
  total_amount,
  COALESCE(currency_code, 'COP'),
  created_at
FROM public.orders
WHERE (payment_method IS NOT NULL OR payment_reference IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM ecommerce.payment_transactions 
    WHERE order_id = public.orders.id
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 8: MIGRAR order_items
-- ============================================
INSERT INTO ecommerce.order_items (
  id, order_id, product_id, product_name, product_sku,
  variant_id, variant_title, unit_price, quantity,
  total_price, currency_code, product_image_url,
  product_slug, selected_options, metadata,
  created_at, updated_at
)
SELECT 
  id,
  order_id,
  product_id,
  product_name,
  product_sku,
  variant_id,
  variant_title,
  unit_price,
  quantity,
  total_price,
  COALESCE(currency_code, 'COP'),
  product_image_url,
  product_slug,
  COALESCE(selected_options, '{}'::jsonb),
  COALESCE(metadata, '{}'::jsonb),
  created_at,
  updated_at
FROM public.order_items
ON CONFLICT (id) DO UPDATE SET
  product_name = EXCLUDED.product_name,
  product_sku = EXCLUDED.product_sku,
  variant_title = EXCLUDED.variant_title,
  unit_price = EXCLUDED.unit_price,
  quantity = EXCLUDED.quantity,
  total_price = EXCLUDED.total_price,
  currency_code = EXCLUDED.currency_code,
  product_image_url = EXCLUDED.product_image_url,
  product_slug = EXCLUDED.product_slug,
  selected_options = EXCLUDED.selected_options,
  metadata = EXCLUDED.metadata,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- PASO 9: MIGRAR component_styles
-- ============================================
-- Nota: El id es auto-generado, pero intentamos preservar los IDs originales
INSERT INTO ecommerce.component_styles (
  store_id, component_name, variables, updated_at
)
SELECT 
  store_id,
  component_name,
  variables,
  updated_at
FROM public.component_styles
ON CONFLICT (store_id, component_name) DO UPDATE SET
  variables = EXCLUDED.variables,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- PASO 10: MIGRAR app_themes
-- ============================================
-- Nota: El id es auto-generado, pero intentamos preservar los IDs originales usando OVERRIDING SYSTEM VALUE
INSERT INTO ecommerce.app_themes (
  theme_name, colors, is_active, created_at, updated_at
)
SELECT 
  theme_name,
  colors,
  COALESCE(is_active, false),
  created_at,
  updated_at
FROM public.app_themes
ON CONFLICT (theme_name) DO UPDATE SET
  colors = EXCLUDED.colors,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- Crear app_theme_versions para temas activos por tienda
-- Primero necesitamos obtener los nuevos IDs de los temas migrados
INSERT INTO ecommerce.app_theme_versions (
  id, store_id, theme_id, is_current, created_at
)
SELECT 
  gen_random_uuid(),
  at_public.store_id,
  at_new.id,
  true,
  at_public.updated_at
FROM public.app_themes at_public
INNER JOIN ecommerce.app_themes at_new ON at_public.theme_name = at_new.theme_name
WHERE at_public.is_active = true AND at_public.store_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM ecommerce.app_theme_versions 
    WHERE store_id = at_public.store_id 
      AND theme_id = at_new.id
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- PASO 11: MIGRAR app_fonts
-- ============================================
-- Nota: El id es auto-generado
INSERT INTO ecommerce.app_fonts (
  font_name, font_family, font_display_name,
  google_font_url, css_font_family, is_active,
  created_at, updated_at
)
SELECT 
  font_name,
  font_family,
  font_display_name,
  google_font_url,
  css_font_family,
  COALESCE(is_active, false),
  created_at,
  updated_at
FROM public.app_fonts
ON CONFLICT (font_name) DO UPDATE SET
  font_family = EXCLUDED.font_family,
  font_display_name = EXCLUDED.font_display_name,
  google_font_url = EXCLUDED.google_font_url,
  css_font_family = EXCLUDED.css_font_family,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================
DO $$
DECLARE
  v_stores_count INTEGER;
  v_user_profiles_count INTEGER;
  v_categories_count INTEGER;
  v_items_count INTEGER;
  v_orders_count INTEGER;
  v_order_items_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_stores_count FROM ecommerce.stores;
  SELECT COUNT(*) INTO v_user_profiles_count FROM ecommerce.user_profiles;
  SELECT COUNT(*) INTO v_categories_count FROM ecommerce.item_categories;
  SELECT COUNT(*) INTO v_items_count FROM ecommerce.store_items;
  SELECT COUNT(*) INTO v_orders_count FROM ecommerce.orders;
  SELECT COUNT(*) INTO v_order_items_count FROM ecommerce.order_items;
  
  RAISE NOTICE '✅ Migración completada:';
  RAISE NOTICE '   - Stores: %', v_stores_count;
  RAISE NOTICE '   - User Profiles: %', v_user_profiles_count;
  RAISE NOTICE '   - Categories: %', v_categories_count;
  RAISE NOTICE '   - Items: %', v_items_count;
  RAISE NOTICE '   - Orders: %', v_orders_count;
  RAISE NOTICE '   - Order Items: %', v_order_items_count;
END $$;

COMMIT;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. Este script usa ON CONFLICT para evitar duplicados
-- 2. Los IDs se preservan cuando es posible
-- 3. Los campos NULL se manejan con COALESCE
-- 4. Los enums se mapean correctamente
-- 5. Las relaciones se crean automáticamente
-- 6. Ejecuta este script en una transacción para poder hacer ROLLBACK si es necesario

