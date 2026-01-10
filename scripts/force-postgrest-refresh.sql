-- ============================================
-- SCRIPT PARA FORZAR ACTUALIZACIÓN DE POSTGREST
-- ============================================
-- Este script ayuda a asegurar que PostgREST reconozca el schema ecommerce

-- ============================================
-- PASO 1: Verificar que las vistas existen
-- ============================================
SELECT 
  'Verificación de vistas' as paso,
  COUNT(*) as total_vistas
FROM information_schema.views
WHERE table_schema = 'ecommerce' 
  AND table_name LIKE '%_legacy';

-- ============================================
-- PASO 2: Otorgar todos los permisos necesarios
-- ============================================
-- Asegurar que el schema tiene permisos
GRANT USAGE ON SCHEMA ecommerce TO anon;
GRANT USAGE ON SCHEMA ecommerce TO authenticated;
GRANT USAGE ON SCHEMA ecommerce TO service_role;

-- Otorgar permisos en todas las vistas legacy
GRANT SELECT ON ALL TABLES IN SCHEMA ecommerce TO anon;
GRANT SELECT ON ALL TABLES IN SCHEMA ecommerce TO authenticated;

-- Otorgar permisos en todas las tablas base
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ecommerce TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA ecommerce TO anon;

-- Otorgar permisos en secuencias (si las hay)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ecommerce TO authenticated;

-- ============================================
-- PASO 3: Crear políticas de seguridad por defecto (si RLS está habilitado)
-- ============================================
-- Nota: Esto es opcional, pero puede ayudar si RLS está bloqueando el acceso

-- Verificar si RLS está habilitado en alguna tabla
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'ecommerce'
  AND rowsecurity = true
LIMIT 10;

-- ============================================
-- PASO 4: Verificar configuración del schema
-- ============================================
SELECT 
  nspname as schema_name,
  nspowner::regrole as owner
FROM pg_namespace
WHERE nspname = 'ecommerce';

-- ============================================
-- PASO 5: Probar acceso directo
-- ============================================
-- Esto debería funcionar desde SQL
SELECT 
  'Test acceso SQL directo' as test,
  COUNT(*) as registros
FROM ecommerce.store_items_legacy;

-- ============================================
-- INSTRUCCIONES IMPORTANTES
-- ============================================
-- Después de ejecutar este script:
-- 
-- 1. Ve a Supabase Dashboard → Settings → API → Data API Settings
-- 2. Verifica que:
--    - "Enable Data API" esté activado ✅
--    - "ECOMMERCE" esté en "Exposed schemas" ✅
--    - "ECOMMERCE" esté en "Extra search path" ✅
--
-- 3. ESPERA 2-3 MINUTOS para que PostgREST actualice su cache
--    (PostgREST actualiza automáticamente cada pocos minutos)
--
-- 4. Si el problema persiste después de esperar:
--    - Intenta hacer un pequeño cambio en cualquier vista (ej: agregar un comentario)
--    - O contacta con soporte de Supabase para forzar un refresh del schema cache
--
-- 5. Verifica que las variables de entorno estén correctas:
--    - NEXT_PUBLIC_SUPABASE_URL
--    - NEXT_PUBLIC_SUPABASE_ANON_KEY

