-- ============================================
-- SCRIPT DE VERIFICACIÓN DE TEMAS OSCUROS
-- Ejecuta este script en Supabase SQL Editor para verificar que los temas oscuros tienen los colores correctos
-- ============================================

-- 1. Verificar temas oscuros existentes
SELECT 
  'Temas Oscuros' as paso,
  theme_name,
  is_active,
  colors->>'background' as background_color,
  colors->>'foreground' as foreground_color,
  colors->>'primary' as primary_color,
  CASE 
    WHEN colors->>'background' LIKE '#0f%' OR colors->>'background' LIKE '#1e%' OR colors->>'background' LIKE '#00%'
    THEN '✅ Fondo oscuro detectado'
    ELSE '⚠️ Fondo puede no ser oscuro'
  END as estado_fondo
FROM app_themes
WHERE theme_name LIKE '%Oscuro%'
ORDER BY theme_name;

-- 2. Verificar valores específicos de "Oscuro Azul"
SELECT 
  'Verificación Oscuro Azul' as paso,
  theme_name,
  CASE 
    WHEN colors->>'background' = '#0f172a' THEN '✅ Background correcto (#0f172a)'
    ELSE '❌ Background incorrecto: ' || (colors->>'background')
  END as background_check,
  CASE 
    WHEN colors->>'foreground' = '#f1f5f9' THEN '✅ Foreground correcto (#f1f5f9)'
    ELSE '❌ Foreground incorrecto: ' || (colors->>'foreground')
  END as foreground_check,
  CASE 
    WHEN colors->>'card' = '#1e293b' THEN '✅ Card correcto (#1e293b)'
    ELSE '❌ Card incorrecto: ' || (colors->>'card')
  END as card_check,
  CASE 
    WHEN colors->>'primary' = '#3b82f6' THEN '✅ Primary correcto (#3b82f6)'
    ELSE '❌ Primary incorrecto: ' || (colors->>'primary')
  END as primary_check
FROM app_themes
WHERE theme_name = 'Oscuro Azul';

-- 3. Verificar valores específicos de "Oscuro Verde"
SELECT 
  'Verificación Oscuro Verde' as paso,
  theme_name,
  CASE 
    WHEN colors->>'background' = '#0f172a' THEN '✅ Background correcto (#0f172a)'
    ELSE '❌ Background incorrecto: ' || (colors->>'background')
  END as background_check,
  CASE 
    WHEN colors->>'foreground' = '#f1f5f9' THEN '✅ Foreground correcto (#f1f5f9)'
    ELSE '❌ Foreground incorrecto: ' || (colors->>'foreground')
  END as foreground_check,
  CASE 
    WHEN colors->>'card' = '#1e293b' THEN '✅ Card correcto (#1e293b)'
    ELSE '❌ Card incorrecto: ' || (colors->>'card')
  END as card_check,
  CASE 
    WHEN colors->>'primary' = '#10b981' THEN '✅ Primary correcto (#10b981)'
    ELSE '❌ Primary incorrecto: ' || (colors->>'primary')
  END as primary_check
FROM app_themes
WHERE theme_name = 'Oscuro Verde';

-- 4. Comparar colores de fondo entre temas claros y oscuros
SELECT 
  'Comparación Temas' as paso,
  theme_name,
  colors->>'background' as background_color,
  CASE 
    WHEN theme_name LIKE '%Oscuro%' THEN '🌙 Tema Oscuro'
    WHEN theme_name LIKE '%Claro%' THEN '☀️ Tema Claro'
    ELSE '❓ Otro'
  END as tipo_tema,
  CASE 
    WHEN theme_name LIKE '%Oscuro%' AND (colors->>'background' = '#0f172a' OR colors->>'background' = '#1e293b')
    THEN '✅ Fondo oscuro correcto'
    WHEN theme_name LIKE '%Claro%' AND colors->>'background' = '#ffffff'
    THEN '✅ Fondo claro correcto'
    ELSE '⚠️ Verificar color de fondo'
  END as estado
FROM app_themes
ORDER BY 
  CASE 
    WHEN theme_name LIKE '%Oscuro%' THEN 1
    WHEN theme_name LIKE '%Claro%' THEN 2
    ELSE 3
  END,
  theme_name;

-- 5. Verificar que todos los campos de color existen en temas oscuros
SELECT 
  'Estructura Completa' as paso,
  theme_name,
  CASE 
    WHEN colors ? 'background' AND colors ? 'foreground' AND colors ? 'card' 
     AND colors ? 'primary' AND colors ? 'secondary' AND colors ? 'accent'
     AND colors ? 'border' AND colors ? 'muted' AND colors ? 'mutedForeground'
    THEN '✅ Todos los campos presentes'
    ELSE '❌ Faltan campos'
  END as estructura_completa,
  jsonb_object_keys(colors) as campos_disponibles
FROM app_themes
WHERE theme_name LIKE '%Oscuro%'
ORDER BY theme_name;

-- 6. Resumen de verificación
SELECT 
  'RESUMEN VERIFICACIÓN TEMAS OSCUROS' as paso,
  COUNT(*) FILTER (WHERE theme_name LIKE '%Oscuro%') as total_temas_oscuros,
  COUNT(*) FILTER (WHERE theme_name LIKE '%Oscuro%' AND colors->>'background' = '#0f172a') as temas_con_fondo_correcto,
  COUNT(*) FILTER (WHERE theme_name LIKE '%Oscuro%' AND is_active = TRUE) as temas_oscuros_activos,
  CASE 
    WHEN COUNT(*) FILTER (WHERE theme_name LIKE '%Oscuro%' AND colors->>'background' = '#0f172a') = 
         COUNT(*) FILTER (WHERE theme_name LIKE '%Oscuro%')
    THEN '✅ Todos los temas oscuros tienen fondo correcto'
    ELSE '⚠️ Algunos temas oscuros pueden tener fondo incorrecto'
  END as estado_final
FROM app_themes;
