-- Script de verificación para diagnosticar problemas con user_profiles
-- EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR

-- ============================================
-- VERIFICACIÓN 1: ¿Existe la tabla?
-- ============================================
SELECT 
  'Verificación Tabla' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_profiles'
    ) THEN '✅ La tabla user_profiles existe'
    ELSE '❌ La tabla user_profiles NO existe. Ejecuta scripts/19-create-user-profiles-table.sql'
  END as resultado;

-- ============================================
-- VERIFICACIÓN 2: ¿RLS está deshabilitado?
-- ============================================
SELECT 
  'Verificación RLS' as verificacion,
  CASE 
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = 'user_profiles'
      AND rowsecurity = true
    ) THEN '✅ RLS está deshabilitado (correcto)'
    ELSE '⚠️ RLS está habilitado. Ejecuta: ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;'
  END as resultado;

-- ============================================
-- VERIFICACIÓN 3: ¿Existe el trigger?
-- ============================================
SELECT 
  'Verificación Trigger' as verificacion,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'on_auth_user_created'
      AND event_object_table = 'users'
      AND event_object_schema = 'auth'
    ) THEN '✅ El trigger on_auth_user_created existe'
    ELSE '❌ El trigger NO existe. Ejecuta scripts/19-create-user-profiles-table.sql'
  END as resultado;

-- ============================================
-- VERIFICACIÓN 4: Contar perfiles existentes
-- ============================================
SELECT 
  'Conteo de Perfiles' as verificacion,
  COUNT(*) as total_perfiles
FROM user_profiles;

-- ============================================
-- VERIFICACIÓN 5: Verificar estructura de la tabla
-- ============================================
SELECT 
  'Estructura de Tabla' as verificacion,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- ============================================
-- SOLUCIÓN RÁPIDA: Deshabilitar RLS si está habilitado
-- ============================================
-- Descomenta la siguiente línea si RLS está habilitado:
-- ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- SOLUCIÓN RÁPIDA: Crear perfil para usuarios existentes sin perfil
-- ============================================
-- Si hay usuarios en auth.users sin perfil, ejecuta esto:
/*
INSERT INTO public.user_profiles (id, email, first_name, last_name)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', '') as first_name,
  COALESCE(u.raw_user_meta_data->>'last_name', '') as last_name
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = u.id
)
ON CONFLICT (id) DO NOTHING;
*/












