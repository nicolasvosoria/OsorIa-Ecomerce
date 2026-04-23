-- ============================================================
-- VERIFICACIÓN DE STORAGE REQUERIDO (fail-closed)
-- Requisitos:
--   - Bucket products existe y es público
--   - Bucket component-images existe y es público
-- ============================================================

-- 1) Estado detallado por bucket requerido
SELECT
  req.bucket_name,
  CASE WHEN b.id IS NOT NULL THEN 'yes' ELSE 'no' END AS exists,
  COALESCE(b.public, FALSE) AS is_public,
  CASE
    WHEN b.id IS NOT NULL AND COALESCE(b.public, FALSE) THEN 'PASS'
    ELSE 'FAIL'
  END AS status
FROM (
  VALUES ('products'), ('component-images')
) AS req(bucket_name)
LEFT JOIN storage.buckets b ON b.id = req.bucket_name
ORDER BY req.bucket_name;

-- 2) Verificación de políticas esperadas
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname IN (
    'Storage public read products',
    'Storage public read component-images',
    'Storage admin upload products',
    'Storage admin upload component-images',
    'Storage admin update products',
    'Storage admin update component-images',
    'Storage admin delete products',
    'Storage admin delete component-images'
  )
ORDER BY policyname;

-- 3) Guard rail fail-closed
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
      'FAIL: buckets faltantes o no públicos: %',
      array_to_string(v_missing_or_private, ', ')
      USING HINT = 'Ejecutá scripts/27-setup-storage-bucket.sql antes de continuar.';
  END IF;
END;
$$;

-- Si llegaste acá sin exception, la verificación pasó.
