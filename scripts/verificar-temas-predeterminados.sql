-- ============================================
-- SCRIPT DE VERIFICACIÓN DE TEMAS PREDETERMINADOS
-- Ejecuta este script en Supabase SQL Editor para verificar que los temas funcionan correctamente
-- ============================================

-- 1. Verificar que la tabla existe
SELECT 
  'Verificación Tabla' as paso,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_themes' AND table_schema = 'public') 
    THEN '✅ Tabla app_themes existe'
    ELSE '❌ Tabla app_themes NO existe - Ejecuta scripts/01-create-themes-table.sql'
  END as estado;

-- 2. Verificar que RLS está deshabilitado
SELECT 
  'Verificación RLS' as paso,
  tablename,
  CASE 
    WHEN rowsecurity THEN '❌ RLS ACTIVO - Debe estar deshabilitado'
    ELSE '✅ RLS DESHABILITADO'
  END as estado
FROM pg_tables 
WHERE tablename = 'app_themes' AND schemaname = 'public';

-- 3. Contar temas existentes
SELECT 
  'Conteo de Temas' as paso,
  COUNT(*) as total_temas,
  COUNT(*) FILTER (WHERE is_active = TRUE) as temas_activos,
  COUNT(*) FILTER (WHERE is_active = FALSE) as temas_inactivos
FROM app_themes;

-- 4. Verificar que existen los 4 temas predeterminados
SELECT 
  'Temas Predeterminados' as paso,
  theme_name,
  is_active,
  CASE 
    WHEN theme_name IN ('Claro Original', 'Claro Azul', 'Oscuro Azul', 'Oscuro Verde') 
    THEN '✅ Tema predeterminado encontrado'
    ELSE '⚠️ Tema adicional'
  END as estado
FROM app_themes
ORDER BY 
  CASE theme_name
    WHEN 'Claro Original' THEN 1
    WHEN 'Claro Azul' THEN 2
    WHEN 'Oscuro Azul' THEN 3
    WHEN 'Oscuro Verde' THEN 4
    ELSE 5
  END;

-- 5. Verificar que "Claro Original" existe y está activo
SELECT 
  'Tema por Defecto' as paso,
  CASE 
    WHEN EXISTS (SELECT 1 FROM app_themes WHERE theme_name = 'Claro Original' AND is_active = TRUE)
    THEN '✅ Claro Original existe y está activo'
    WHEN EXISTS (SELECT 1 FROM app_themes WHERE theme_name = 'Claro Original' AND is_active = FALSE)
    THEN '⚠️ Claro Original existe pero NO está activo'
    ELSE '❌ Claro Original NO existe - Ejecuta scripts/01-create-themes-table.sql'
  END as estado;

-- 6. Verificar estructura de colores de los temas
SELECT 
  'Estructura de Colores' as paso,
  theme_name,
  CASE 
    WHEN colors ? 'primary' AND colors ? 'secondary' AND colors ? 'accent' 
     AND colors ? 'background' AND colors ? 'foreground'
    THEN '✅ Estructura correcta'
    ELSE '❌ Faltan campos de color'
  END as estado,
  jsonb_object_keys(colors) as campos_color
FROM app_themes
ORDER BY theme_name;

-- 7. Verificar valores de colores del tema "Claro Original"
SELECT 
  'Valores Claro Original' as paso,
  theme_name,
  colors->>'primary' as primary_color,
  colors->>'secondary' as secondary_color,
  colors->>'background' as background_color,
  colors->>'foreground' as foreground_color,
  CASE 
    WHEN colors->>'primary' = '#005aa1' 
     AND colors->>'secondary' = '#c4faff'
     AND colors->>'background' = '#ffffff'
    THEN '✅ Valores correctos'
    ELSE '⚠️ Valores diferentes a los esperados'
  END as estado
FROM app_themes
WHERE theme_name = 'Claro Original';

-- 8. Verificar si hay temas con store_id (multi-tenant)
SELECT 
  'Temas Multi-tenant' as paso,
  COUNT(*) FILTER (WHERE store_id IS NULL) as temas_globales,
  COUNT(*) FILTER (WHERE store_id IS NOT NULL) as temas_por_tienda,
  COUNT(DISTINCT store_id) as tiendas_con_temas
FROM app_themes;

-- 9. Mostrar tema activo actual
SELECT 
  'Tema Activo Actual' as paso,
  theme_name,
  is_active,
  store_id,
  CASE 
    WHEN is_active = TRUE THEN '✅ Este es el tema activo'
    ELSE '❌ Este tema NO está activo'
  END as estado
FROM app_themes
WHERE is_active = TRUE
ORDER BY created_at DESC
LIMIT 1;

-- 10. Resumen final
SELECT 
  'RESUMEN FINAL' as paso,
  CASE 
    WHEN (SELECT COUNT(*) FROM app_themes) >= 4 
     AND EXISTS (SELECT 1 FROM app_themes WHERE theme_name = 'Claro Original')
     AND EXISTS (SELECT 1 FROM app_themes WHERE is_active = TRUE)
    THEN '✅ TODO CORRECTO - Los temas predeterminados están funcionando'
    ELSE '❌ HAY PROBLEMAS - Revisa los resultados anteriores'
  END as estado;
