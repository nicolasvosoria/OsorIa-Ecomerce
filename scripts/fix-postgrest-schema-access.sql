-- ============================================
-- SCRIPT PARA VERIFICAR Y CORREGIR ACCESO DE POSTGREST AL SCHEMA ECOMMERCE
-- ============================================

-- ============================================
-- PASO 1: Verificar que las vistas existen y son accesibles
-- ============================================
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'ecommerce'
  AND viewname LIKE '%_legacy'
ORDER BY viewname;

-- ============================================
-- PASO 2: Verificar permisos en el schema
-- ============================================
-- Asegurar que el schema tiene permisos correctos
GRANT USAGE ON SCHEMA ecommerce TO anon, authenticated;
GRANT USAGE ON SCHEMA ecommerce TO postgres, service_role;

-- ============================================
-- PASO 3: Verificar permisos en las vistas
-- ============================================
GRANT SELECT ON ecommerce.stores_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.item_options_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.store_items_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.orders_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.component_styles_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.app_themes_legacy TO anon, authenticated;
GRANT SELECT ON ecommerce.app_fonts_legacy TO anon, authenticated;

-- ============================================
-- PASO 4: Verificar permisos en las tablas base
-- ============================================
-- Asegurar permisos en las tablas que las vistas usan
GRANT SELECT ON ecommerce.stores TO anon, authenticated;
GRANT SELECT ON ecommerce.store_branding TO anon, authenticated;
GRANT SELECT ON ecommerce.store_contact TO anon, authenticated;
GRANT SELECT ON ecommerce.store_commerce_settings TO anon, authenticated;
GRANT SELECT ON ecommerce.store_seo TO anon, authenticated;
GRANT SELECT ON ecommerce.store_seo_keywords TO anon, authenticated;
GRANT SELECT ON ecommerce.store_integrations TO anon, authenticated;
GRANT SELECT ON ecommerce.store_items TO anon, authenticated;
GRANT SELECT ON ecommerce.item_seo TO anon, authenticated;
GRANT SELECT ON ecommerce.item_metrics TO anon, authenticated;
GRANT SELECT ON ecommerce.item_tags TO anon, authenticated;
GRANT SELECT ON ecommerce.item_images TO anon, authenticated;
GRANT SELECT ON ecommerce.item_categories TO anon, authenticated;
GRANT SELECT ON ecommerce.orders TO anon, authenticated;
GRANT SELECT ON ecommerce.order_addresses TO anon, authenticated;
GRANT SELECT ON ecommerce.payment_transactions TO anon, authenticated;
GRANT SELECT ON ecommerce.order_items TO anon, authenticated;
GRANT SELECT ON ecommerce.item_options TO anon, authenticated;
GRANT SELECT ON ecommerce.item_option_values TO anon, authenticated;
GRANT SELECT ON ecommerce.component_styles TO anon, authenticated;
GRANT SELECT ON ecommerce.app_themes TO anon, authenticated;
GRANT SELECT ON ecommerce.app_theme_versions TO anon, authenticated;
GRANT SELECT ON ecommerce.app_fonts TO anon, authenticated;

-- ============================================
-- PASO 5: Verificar configuración del schema
-- ============================================
SELECT 
  nspname as schema_name,
  nspowner::regrole as owner,
  nspacl as permissions
FROM pg_namespace
WHERE nspname = 'ecommerce';

-- ============================================
-- PASO 6: Probar acceso directo a una vista
-- ============================================
-- Esto debería funcionar si todo está configurado correctamente
SELECT 
  'Test acceso directo' as test,
  COUNT(*) as registros
FROM ecommerce.store_items_legacy;

-- ============================================
-- NOTA IMPORTANTE
-- ============================================
-- Después de ejecutar este script:
-- 1. Ve a Supabase Dashboard → Settings → API → Data API Settings
-- 2. Verifica que "ECOMMERCE" esté en "Exposed schemas"
-- 3. Verifica que "ECOMMERCE" esté en "Extra search path"
-- 4. Espera 1-2 minutos para que PostgREST actualice el cache
-- 5. O reinicia el proyecto Supabase si es posible

