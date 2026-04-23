-- Dedicated storage for popup and marketing assets.
-- Scope is intentionally limited to storage.* objects for the marketing bucket.

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'marketing-assets',
  'marketing-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'marketing_assets_public_read'
  ) THEN
    CREATE POLICY marketing_assets_public_read
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'marketing-assets');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'marketing_assets_admin_insert'
  ) THEN
    CREATE POLICY marketing_assets_admin_insert
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'marketing-assets'
      AND auth.uid() IN (
        SELECT id
        FROM ecommerce.user_profiles
        WHERE role = 'admin'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'marketing_assets_admin_update'
  ) THEN
    CREATE POLICY marketing_assets_admin_update
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'marketing-assets'
      AND auth.uid() IN (
        SELECT id
        FROM ecommerce.user_profiles
        WHERE role = 'admin'
      )
    )
    WITH CHECK (
      bucket_id = 'marketing-assets'
      AND auth.uid() IN (
        SELECT id
        FROM ecommerce.user_profiles
        WHERE role = 'admin'
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'marketing_assets_admin_delete'
  ) THEN
    CREATE POLICY marketing_assets_admin_delete
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'marketing-assets'
      AND auth.uid() IN (
        SELECT id
        FROM ecommerce.user_profiles
        WHERE role = 'admin'
      )
    );
  END IF;
END $$;
