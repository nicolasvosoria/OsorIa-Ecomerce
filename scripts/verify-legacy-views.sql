-- ============================================
-- SCRIPT PARA VERIFICAR QUE LAS VISTAS LEGACY EXISTEN
-- ============================================

-- Verificar vistas legacy en schema ecommerce
SELECT 
  table_schema,
  table_name,
  CASE 
    WHEN table_type = 'VIEW' THEN '✅ Vista existe'
    WHEN table_type = 'BASE TABLE' THEN '⚠️ Es una tabla, no una vista'
    ELSE '❌ No encontrada'
  END as estado
FROM information_schema.tables
WHERE table_schema = 'ecommerce' 
  AND table_name LIKE '%_legacy'
ORDER BY table_name;

-- Verificar que las vistas sean accesibles
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE schemaname = 'ecommerce'
  AND viewname LIKE '%_legacy'
ORDER BY viewname;

-- Verificar permisos
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'ecommerce'
  AND table_name LIKE '%_legacy'
ORDER BY table_name, grantee;

