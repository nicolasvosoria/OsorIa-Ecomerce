-- Script FINAL para solucionar todos los problemas de RLS y datos
-- EJECUTA ESTE SCRIPT COMPLETO EN SUPABASE SQL EDITOR

-- ============================================
-- PASO 1: DESHABILITAR RLS COMPLETAMENTE
-- ============================================
ALTER TABLE IF EXISTS app_themes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_fonts DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 2: ELIMINAR TODAS LAS POLÍTICAS RLS EXISTENTES
-- ============================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('app_themes', 'app_fonts')) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ============================================
-- PASO 3: VERIFICAR QUE LAS TABLAS EXISTEN Y CREARLAS SI NO EXISTEN
-- ============================================

-- Crear app_themes si no existe
CREATE TABLE IF NOT EXISTS app_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name VARCHAR(100) NOT NULL UNIQUE,
  colors JSONB NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear app_fonts si no existe
CREATE TABLE IF NOT EXISTS app_fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  font_name VARCHAR(100) NOT NULL UNIQUE,
  font_family VARCHAR(200) NOT NULL,
  font_display_name VARCHAR(100),
  css_font_family VARCHAR(200),
  google_font_url TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 4: INSERTAR DATOS SI LAS TABLAS ESTÁN VACÍAS
-- ============================================

-- Insertar temas
INSERT INTO app_themes (theme_name, colors, is_active)
SELECT * FROM (VALUES
  ('Claro Original', '{"primary":"#005aa1","secondary":"#c4faff","accent":"#005aa1","background":"#ffffff","foreground":"#1a1a1a","card":"#ffffff","cardForeground":"#1a1a1a","border":"#e5e5e5","muted":"#f5f5f5","mutedForeground":"#737373"}'::jsonb, TRUE),
  ('Claro Azul', '{"primary":"#2563eb","secondary":"#dbeafe","accent":"#2563eb","background":"#ffffff","foreground":"#1e293b","card":"#ffffff","cardForeground":"#1e293b","border":"#e2e8f0","muted":"#f1f5f9","mutedForeground":"#64748b"}'::jsonb, FALSE),
  ('Oscuro Azul', '{"primary":"#3b82f6","secondary":"#1e3a8a","accent":"#60a5fa","background":"#0f172a","foreground":"#f1f5f9","card":"#1e293b","cardForeground":"#f1f5f9","border":"#334155","muted":"#1e293b","mutedForeground":"#94a3b8"}'::jsonb, FALSE),
  ('Oscuro Verde', '{"primary":"#10b981","secondary":"#064e3b","accent":"#34d399","background":"#0f172a","foreground":"#f1f5f9","card":"#1e293b","cardForeground":"#f1f5f9","border":"#334155","muted":"#1e293b","mutedForeground":"#94a3b8"}'::jsonb, FALSE)
) AS v(theme_name, colors, is_active)
WHERE NOT EXISTS (SELECT 1 FROM app_themes WHERE theme_name = v.theme_name)
ON CONFLICT (theme_name) DO NOTHING;

-- Insertar fuentes
INSERT INTO app_fonts (font_name, font_family, font_display_name, css_font_family, google_font_url, is_active)
SELECT * FROM (VALUES
  ('Inter', '"Inter", sans-serif', 'Inter', 'Inter', 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', TRUE),
  ('Roboto', '"Roboto", sans-serif', 'Roboto', 'Roboto', 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap', FALSE),
  ('Open Sans', '"Open Sans", sans-serif', 'Open Sans', 'Open Sans', 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;600;700&display=swap', FALSE),
  ('Poppins', '"Poppins", sans-serif', 'Poppins', 'Poppins', 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap', FALSE),
  ('Montserrat', '"Montserrat", sans-serif', 'Montserrat', 'Montserrat', 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap', FALSE)
) AS v(font_name, font_family, font_display_name, css_font_family, google_font_url, is_active)
WHERE NOT EXISTS (SELECT 1 FROM app_fonts WHERE font_name = v.font_name)
ON CONFLICT (font_name) DO NOTHING;

-- Actualizar valores NULL en columnas obligatorias
UPDATE app_fonts 
SET 
  font_display_name = COALESCE(font_display_name, font_name),
  css_font_family = COALESCE(css_font_family, font_name)
WHERE font_display_name IS NULL OR css_font_family IS NULL;

-- ============================================
-- PASO 5: VERIFICACIÓN FINAL
-- ============================================

-- Verificar RLS
SELECT 
  'Verificación RLS' as paso,
  tablename,
  rowsecurity as rls_habilitado,
  CASE WHEN rowsecurity THEN '❌ ACTIVO' ELSE '✅ DESHABILITADO' END as estado
FROM pg_tables 
WHERE tablename IN ('app_themes', 'app_fonts')
AND schemaname = 'public';

-- Verificar datos
SELECT 'Verificación Datos' as paso, 'app_themes' as tabla, COUNT(*) as cantidad FROM app_themes
UNION ALL
SELECT 'Verificación Datos', 'app_fonts', COUNT(*) FROM app_fonts;

-- Mostrar temas activos
SELECT 'Temas Activos' as paso, theme_name, is_active FROM app_themes ORDER BY is_active DESC, theme_name;

-- Mostrar fuentes activas
SELECT 'Fuentes Activas' as paso, font_name, is_active FROM app_fonts ORDER BY is_active DESC, font_name;




