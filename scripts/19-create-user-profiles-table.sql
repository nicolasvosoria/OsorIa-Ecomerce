-- Script para crear la tabla de perfiles de usuario
-- EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR

-- ============================================
-- PASO 1: CREAR TABLA user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 2: DESHABILITAR RLS (temporalmente para facilitar desarrollo)
-- ============================================
ALTER TABLE IF EXISTS public.user_profiles DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 3: CREAR TRIGGER PARA CREAR PERFIL AUTOMÁTICAMENTE
-- ============================================
-- Función para crear perfil automáticamente cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASO 4: VERIFICACIÓN
-- ============================================
-- Verificar que la tabla existe
SELECT 
  'Verificación Tabla' as paso,
  tablename,
  CASE WHEN tablename = 'user_profiles' THEN '✅ Existe' ELSE '❌ No existe' END as estado
FROM pg_tables 
WHERE tablename = 'user_profiles'
AND schemaname = 'public';

-- Verificar trigger
SELECT 
  'Verificación Trigger' as paso,
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

