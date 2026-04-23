-- ============================================================
-- SCRIPT DE SETUP OBLIGATORIO DE STORAGE (Supabase)
-- Buckets requeridos por la app:
--   1) products
--   2) component-images
--
-- Este script es idempotente y fail-closed:
-- - Declara ambos buckets explícitamente
-- - Fuerza estado público en ambos
-- - Crea políticas de lectura/escritura por bucket
-- - Falla con EXCEPTION si falta algún bucket o no quedó público
-- ============================================================

BEGIN;

-- 1) Crear/asegurar buckets requeridos
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('products', 'products', TRUE),
  ('component-images', 'component-images', TRUE)
ON CONFLICT (id)
DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;

-- 2) Función helper para permisos de escritura (admin/owner)
--    Nota: evita dependencia dura de user_profiles.role, porque ese
--    campo no siempre está presente en todos los entornos.
CREATE OR REPLACE FUNCTION public.is_storage_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_has_user_role_column BOOLEAN;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  v_uid := auth.uid();

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'role'
  )
  INTO v_has_user_role_column;

  IF v_has_user_role_column THEN
    EXECUTE
      'SELECT EXISTS (
         SELECT 1
         FROM public.user_profiles
         WHERE id = $1
           AND role IN (''admin'', ''super_admin'')
       )'
    INTO v_is_admin
    USING v_uid;
  END IF;

  IF v_is_admin THEN
    RETURN TRUE;
  END IF;

  IF to_regclass('public.store_users') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.store_users
      WHERE user_id = v_uid
        AND role IN ('owner', 'admin')
    )
    INTO v_is_admin;
  END IF;

  RETURN COALESCE(v_is_admin, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.is_storage_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_storage_admin() TO authenticated;

-- 3) Reemplazar políticas legacy (si existían)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete" ON storage.objects;

-- 4) Políticas explícitas por bucket
DROP POLICY IF EXISTS "Storage public read products" ON storage.objects;
DROP POLICY IF EXISTS "Storage public read component-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage admin upload products" ON storage.objects;
DROP POLICY IF EXISTS "Storage admin upload component-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage admin update products" ON storage.objects;
DROP POLICY IF EXISTS "Storage admin update component-images" ON storage.objects;
DROP POLICY IF EXISTS "Storage admin delete products" ON storage.objects;
DROP POLICY IF EXISTS "Storage admin delete component-images" ON storage.objects;

CREATE POLICY "Storage public read products"
ON storage.objects
FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Storage public read component-images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'component-images');

CREATE POLICY "Storage admin upload products"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products'
  AND public.is_storage_admin()
);

CREATE POLICY "Storage admin upload component-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'component-images'
  AND public.is_storage_admin()
);

CREATE POLICY "Storage admin update products"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products'
  AND public.is_storage_admin()
)
WITH CHECK (
  bucket_id = 'products'
  AND public.is_storage_admin()
);

CREATE POLICY "Storage admin update component-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'component-images'
  AND public.is_storage_admin()
)
WITH CHECK (
  bucket_id = 'component-images'
  AND public.is_storage_admin()
);

CREATE POLICY "Storage admin delete products"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products'
  AND public.is_storage_admin()
);

CREATE POLICY "Storage admin delete component-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'component-images'
  AND public.is_storage_admin()
);

-- 5) Verificación fail-closed de buckets requeridos
DO $$
DECLARE
  v_missing_or_private TEXT[];
BEGIN
  SELECT ARRAY_AGG(req.bucket_name)
  INTO v_missing_or_private
  FROM (
    VALUES ('products'), ('component-images')
  ) AS req(bucket_name)
  LEFT JOIN storage.buckets b ON b.id = req.bucket_name
  WHERE b.id IS NULL OR COALESCE(b.public, FALSE) IS FALSE;

  IF v_missing_or_private IS NOT NULL THEN
    RAISE EXCEPTION
      'Storage setup inválido. Buckets faltantes o no públicos: %',
      array_to_string(v_missing_or_private, ', ')
      USING HINT = 'Ejecutá scripts/27-setup-storage-bucket.sql y luego scripts/27-verify-storage-buckets.sql.';
  END IF;
END;
$$;

COMMIT;

-- Checklist rápido post-setup:
-- 1) Ejecutar scripts/27-verify-storage-buckets.sql
-- 2) Confirmar que products y component-images figuran como públicos
-- 3) Confirmar políticas "Storage public/admin ..." en storage.objects
