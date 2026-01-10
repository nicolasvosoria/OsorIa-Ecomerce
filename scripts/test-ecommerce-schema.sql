-- ============================================
-- SCRIPT DE PRUEBA PARA VERIFICAR ACCESO AL SCHEMA ECOMMERCE
-- Prueba las consultas más comunes que hace la aplicación
-- ============================================

-- ============================================
-- PRUEBA 1: Acceso a stores_legacy
-- ============================================
SELECT 
  'Test stores_legacy' as test,
  COUNT(*) as total_stores,
  COUNT(CASE WHEN is_active THEN 1 END) as stores_activos
FROM ecommerce.stores_legacy;

-- ============================================
-- PRUEBA 2: Acceso a store_items_legacy
-- ============================================
SELECT 
  'Test store_items_legacy' as test,
  COUNT(*) as total_items,
  COUNT(CASE WHEN is_active THEN 1 END) as items_activos
FROM ecommerce.store_items_legacy;

-- ============================================
-- PRUEBA 3: Acceso a orders_legacy
-- ============================================
SELECT 
  'Test orders_legacy' as test,
  COUNT(*) as total_orders,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as orders_pendientes,
  SUM(total_amount) as total_ventas
FROM ecommerce.orders_legacy;

-- ============================================
-- PRUEBA 4: Acceso a orders_legacy con items
-- ============================================
SELECT 
  'Test orders con items' as test,
  o.id,
  o.order_number,
  o.total_amount,
  COUNT(oi.id) as items_count
FROM ecommerce.orders_legacy o
LEFT JOIN ecommerce.order_items oi ON oi.order_id = o.id
GROUP BY o.id, o.order_number, o.total_amount
LIMIT 5;

-- ============================================
-- PRUEBA 5: Acceso a item_categories
-- ============================================
SELECT 
  'Test item_categories' as test,
  COUNT(*) as total_categorias,
  COUNT(CASE WHEN is_active THEN 1 END) as categorias_activas
FROM ecommerce.item_categories;

-- ============================================
-- PRUEBA 6: Acceso a user_profiles
-- ============================================
SELECT 
  'Test user_profiles' as test,
  COUNT(*) as total_usuarios,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
FROM ecommerce.user_profiles;

-- ============================================
-- PRUEBA 7: Acceso a app_themes_legacy
-- ============================================
SELECT 
  'Test app_themes_legacy' as test,
  COUNT(*) as total_temas,
  COUNT(CASE WHEN is_active THEN 1 END) as temas_activos
FROM ecommerce.app_themes_legacy;

-- ============================================
-- PRUEBA 8: Acceso a app_fonts_legacy
-- ============================================
SELECT 
  'Test app_fonts_legacy' as test,
  COUNT(*) as total_fuentes,
  COUNT(CASE WHEN is_active THEN 1 END) as fuentes_activas
FROM ecommerce.app_fonts_legacy;

-- ============================================
-- PRUEBA 9: Acceso a component_styles_legacy
-- ============================================
SELECT 
  'Test component_styles_legacy' as test,
  COUNT(*) as total_estilos,
  COUNT(DISTINCT component_name) as componentes_unicos
FROM ecommerce.component_styles_legacy;

-- ============================================
-- PRUEBA 10: Verificar relaciones entre tablas
-- ============================================
SELECT 
  'Test relaciones' as test,
  (SELECT COUNT(*) FROM ecommerce.stores) as stores,
  (SELECT COUNT(*) FROM ecommerce.store_items WHERE store_id IN (SELECT id FROM ecommerce.stores)) as items_con_store,
  (SELECT COUNT(*) FROM ecommerce.item_categories WHERE store_id IN (SELECT id FROM ecommerce.stores)) as categorias_con_store,
  (SELECT COUNT(*) FROM ecommerce.orders WHERE store_id IN (SELECT id FROM ecommerce.stores)) as orders_con_store;

-- ============================================
-- PRUEBA 11: Verificar que las vistas legacy devuelven datos correctos
-- ============================================
-- Verificar que store_items_legacy tiene todos los campos esperados
SELECT 
  'Test estructura store_items_legacy' as test,
  COUNT(*) as items_con_todos_campos
FROM ecommerce.store_items_legacy
WHERE id IS NOT NULL
  AND item_name IS NOT NULL
  AND store_id IS NOT NULL
  AND created_at IS NOT NULL;

-- ============================================
-- RESUMEN FINAL
-- ============================================
SELECT 
  '✅ RESUMEN FINAL' as resultado,
  'Todas las pruebas completadas' as estado,
  NOW() as fecha_verificacion;

