-- ============================================
-- SCRIPT DE VERIFICACIÓN DE MIGRACIÓN
-- Verifica que todos los datos se migraron correctamente
-- ============================================

-- Comparar conteos entre public y ecommerce
SELECT 
  'stores' as tabla,
  (SELECT COUNT(*) FROM public.stores) as public_count,
  (SELECT COUNT(*) FROM ecommerce.stores) as ecommerce_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.stores) = (SELECT COUNT(*) FROM ecommerce.stores) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END as estado
UNION ALL
SELECT 
  'user_profiles' as tabla,
  (SELECT COUNT(*) FROM public.user_profiles) as public_count,
  (SELECT COUNT(*) FROM ecommerce.user_profiles) as ecommerce_count,
  CASE 
    WHEN (SELECT COUNT(*) FROM public.user_profiles) = (SELECT COUNT(*) FROM ecommerce.user_profiles) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END as estado
UNION ALL
SELECT 
  'item_categories',
  (SELECT COUNT(*) FROM public.item_categories),
  (SELECT COUNT(*) FROM ecommerce.item_categories),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.item_categories) = (SELECT COUNT(*) FROM ecommerce.item_categories) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'store_items',
  (SELECT COUNT(*) FROM public.store_items),
  (SELECT COUNT(*) FROM ecommerce.store_items),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.store_items) = (SELECT COUNT(*) FROM ecommerce.store_items) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'item_variants',
  (SELECT COUNT(*) FROM public.item_variants),
  (SELECT COUNT(*) FROM ecommerce.item_variants),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.item_variants) = (SELECT COUNT(*) FROM ecommerce.item_variants) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'item_images',
  (SELECT COUNT(*) FROM public.item_images),
  (SELECT COUNT(*) FROM ecommerce.item_images),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.item_images) <= (SELECT COUNT(*) FROM ecommerce.item_images) 
    THEN '✅ OK (puede haber más por primary_image_url)' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'orders',
  (SELECT COUNT(*) FROM public.orders),
  (SELECT COUNT(*) FROM ecommerce.orders),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.orders) = (SELECT COUNT(*) FROM ecommerce.orders) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'order_items',
  (SELECT COUNT(*) FROM public.order_items),
  (SELECT COUNT(*) FROM ecommerce.order_items),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.order_items) = (SELECT COUNT(*) FROM ecommerce.order_items) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'component_styles',
  (SELECT COUNT(*) FROM public.component_styles),
  (SELECT COUNT(*) FROM ecommerce.component_styles),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.component_styles) = (SELECT COUNT(*) FROM ecommerce.component_styles) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'app_themes',
  (SELECT COUNT(*) FROM public.app_themes),
  (SELECT COUNT(*) FROM ecommerce.app_themes),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.app_themes) = (SELECT COUNT(*) FROM ecommerce.app_themes) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END
UNION ALL
SELECT 
  'app_fonts',
  (SELECT COUNT(*) FROM public.app_fonts),
  (SELECT COUNT(*) FROM ecommerce.app_fonts),
  CASE 
    WHEN (SELECT COUNT(*) FROM public.app_fonts) = (SELECT COUNT(*) FROM ecommerce.app_fonts) 
    THEN '✅ OK' 
    ELSE '❌ DIFERENCIA' 
  END;

-- Verificar relaciones de stores
SELECT 
  'store_branding' as tabla_relacionada,
  COUNT(*) as registros,
  COUNT(DISTINCT store_id) as stores_con_branding
FROM ecommerce.store_branding;

SELECT 
  'store_contact' as tabla_relacionada,
  COUNT(*) as registros,
  COUNT(DISTINCT store_id) as stores_con_contacto
FROM ecommerce.store_contact;

SELECT 
  'store_commerce_settings' as tabla_relacionada,
  COUNT(*) as registros,
  COUNT(DISTINCT store_id) as stores_con_settings
FROM ecommerce.store_commerce_settings;

SELECT 
  'store_seo' as tabla_relacionada,
  COUNT(*) as registros,
  COUNT(DISTINCT store_id) as stores_con_seo
FROM ecommerce.store_seo;

SELECT 
  'store_seo_keywords' as tabla_relacionada,
  COUNT(*) as total_keywords,
  COUNT(DISTINCT store_id) as stores_con_keywords
FROM ecommerce.store_seo_keywords;

SELECT 
  'store_integrations' as tabla_relacionada,
  COUNT(*) as registros,
  COUNT(DISTINCT store_id) as stores_con_integraciones
FROM ecommerce.store_integrations;

-- Verificar relaciones de items
SELECT 
  'item_seo' as tabla_relacionada,
  COUNT(*) as registros,
  COUNT(DISTINCT item_id) as items_con_seo
FROM ecommerce.item_seo;

SELECT 
  'item_metrics' as tabla_relacionada,
  COUNT(*) as registros,
  COUNT(DISTINCT item_id) as items_con_metricas
FROM ecommerce.item_metrics;

SELECT 
  'item_tags' as tabla_relacionada,
  COUNT(*) as total_tags,
  COUNT(DISTINCT item_id) as items_con_tags
FROM ecommerce.item_tags;

SELECT 
  'order_addresses' as tabla_relacionada,
  COUNT(*) as direcciones,
  COUNT(DISTINCT order_id) as pedidos_con_direccion
FROM ecommerce.order_addresses;

SELECT 
  'payment_transactions' as tabla_relacionada,
  COUNT(*) as transacciones,
  COUNT(DISTINCT order_id) as pedidos_con_pago
FROM ecommerce.payment_transactions;

SELECT 
  'app_theme_versions' as tabla_relacionada,
  COUNT(*) as versiones,
  COUNT(DISTINCT store_id) as tiendas_con_temas
FROM ecommerce.app_theme_versions;

-- Verificar integridad de datos
SELECT 
  'Verificación de integridad' as tipo,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM ecommerce.store_items si
      LEFT JOIN ecommerce.item_metrics im ON si.id = im.item_id
      WHERE im.item_id IS NULL
    ) THEN '✅ Todos los items tienen métricas'
    ELSE '❌ Hay items sin métricas'
  END as estado
UNION ALL
SELECT 
  'Verificación de integridad',
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM ecommerce.orders o
      LEFT JOIN ecommerce.order_addresses oa ON o.id = oa.order_id AND oa.addr_type = 'shipping'
      WHERE oa.order_id IS NULL AND o.shipping_address IS NOT NULL
    ) THEN '✅ Todos los pedidos con dirección tienen order_addresses'
    ELSE '⚠️ Algunos pedidos pueden no tener order_addresses (verificar)'
  END
UNION ALL
SELECT 
  'Verificación de integridad',
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM ecommerce.order_items oi
      LEFT JOIN ecommerce.orders o ON oi.order_id = o.id
      WHERE o.id IS NULL
    ) THEN '✅ Todos los order_items tienen orders válidos'
    ELSE '❌ Hay order_items huérfanos'
  END;

