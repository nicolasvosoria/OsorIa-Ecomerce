-- ============================================
-- SCRIPT DE DIAGNÓSTICO PARA POSTGREST
-- Verifica la configuración de PostgREST para acceder al schema ecommerce
-- ============================================

-- 1. Verificar que las vistas legacy existen
SELECT 
  'Vistas Legacy' as tipo,
  COUNT(*) as cantidad,
  string_agg(table_name, ', ' ORDER BY table_name) as vistas
FROM information_schema.views
WHERE table_schema = 'ecommerce' 
  AND table_name LIKE '%_legacy';

-- 2. Verificar tablas en el schema ecommerce
SELECT 
  'Tablas en ecommerce' as tipo,
  COUNT(*) as cantidad,
  string_agg(table_name, ', ' ORDER BY table_name) as tablas
FROM information_schema.tables
WHERE table_schema = 'ecommerce' 
  AND table_type = 'BASE TABLE';

-- 3. Verificar que el schema está accesible
SELECT 
  schema_name,
  schema_owner
FROM information_schema.schemata
WHERE schema_name = 'ecommerce';

-- 4. Probar acceso directo a una vista
-- Esto debería funcionar si las vistas están creadas
SELECT 
  'Test acceso a stores_legacy' as test,
  COUNT(*) as registros
FROM ecommerce.stores_legacy;

-- 5. Verificar permisos en el schema
SELECT 
  nspname as schema_name,
  nspowner::regrole as owner
FROM pg_namespace
WHERE nspname = 'ecommerce';

-- 6. Verificar si hay políticas RLS que puedan estar bloqueando
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'ecommerce'
  AND tablename LIKE '%_legacy';

