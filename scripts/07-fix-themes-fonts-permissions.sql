-- Script para permitir que usuarios autenticados puedan cambiar temas y fuentes
-- Este script agrega las políticas de Row Level Security necesarias

-- ============================================
-- POLÍTICAS PARA app_themes
-- ============================================

-- Habilitar RLS en app_themes si no está habilitado
ALTER TABLE app_themes ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer los temas (público)
DROP POLICY IF EXISTS "Anyone can read themes" ON app_themes;
CREATE POLICY "Anyone can read themes"
  ON app_themes
  FOR SELECT
  USING (true);

-- Política: Usuarios autenticados pueden actualizar temas
DROP POLICY IF EXISTS "Authenticated users can update themes" ON app_themes;
CREATE POLICY "Authenticated users can update themes"
  ON app_themes
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- POLÍTICAS PARA app_fonts
-- ============================================

-- Habilitar RLS en app_fonts si no está habilitado
ALTER TABLE app_fonts ENABLE ROW LEVEL SECURITY;

-- Política: Todos pueden leer las fuentes (público)
DROP POLICY IF EXISTS "Anyone can read fonts" ON app_fonts;
CREATE POLICY "Anyone can read fonts"
  ON app_fonts
  FOR SELECT
  USING (true);

-- Política: Usuarios autenticados pueden actualizar fuentes
DROP POLICY IF EXISTS "Authenticated users can update fonts" ON app_fonts;
CREATE POLICY "Authenticated users can update fonts"
  ON app_fonts
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que las políticas se crearon correctamente
-- Ejecuta esto para ver las políticas:
-- SELECT * FROM pg_policies WHERE tablename IN ('app_themes', 'app_fonts');




