-- Script para configurar el bucket de Storage en Supabase
-- Este script debe ejecutarse en el SQL Editor de Supabase

-- 1. Crear el bucket si no existe
-- Nota: Los buckets se crean desde la interfaz de Supabase Storage o mediante la API
-- Este script asume que el bucket ya existe o se creará manualmente
-- Bucket name: "component-images"

-- 2. Crear políticas RLS para el bucket "component-images"
-- Nota: Si las políticas ya existen, se eliminarán y se recrearán

-- Eliminar políticas existentes si existen (para evitar errores)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- Política para lectura pública (todos pueden ver las imágenes)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'component-images');

-- Política para subir imágenes (solo administradores)
CREATE POLICY "Admin Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'component-images' AND
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  )
);

-- Política para actualizar imágenes (solo administradores)
CREATE POLICY "Admin Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'component-images' AND
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  )
);

-- Política para eliminar imágenes (solo administradores)
CREATE POLICY "Admin Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'component-images' AND
  auth.uid() IN (
    SELECT id FROM user_profiles WHERE role = 'admin'
  )
);

-- Nota: Si el bucket no existe, créalo manualmente desde:
-- Supabase Dashboard → Storage → New Bucket
-- Nombre: component-images
-- Público: Sí (para que las imágenes sean accesibles públicamente)

