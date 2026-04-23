-- ============================================================
-- FIX: permisos y RLS para ecommerce.component_styles
-- Scope: SOLO schema ecommerce
-- No tocar public.*
-- Objetivo:
--   - mantener lectura pública/autenticada existente
--   - habilitar INSERT/UPDATE/DELETE para authenticated
--   - restringir mutaciones a admins reales del ecommerce
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('ecommerce.component_styles') IS NULL THEN
    RAISE EXCEPTION 'Missing table ecommerce.component_styles';
  END IF;

  IF to_regclass('ecommerce.user_profiles') IS NULL THEN
    RAISE EXCEPTION 'Missing table ecommerce.user_profiles';
  END IF;

  IF to_regclass('ecommerce.store_users') IS NULL THEN
    RAISE EXCEPTION 'Missing table ecommerce.store_users';
  END IF;

  IF to_regclass('ecommerce.store_user_roles') IS NULL THEN
    RAISE EXCEPTION 'Missing table ecommerce.store_user_roles';
  END IF;

  IF to_regclass('ecommerce.roles') IS NULL THEN
    RAISE EXCEPTION 'Missing table ecommerce.roles';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION ecommerce.is_component_styles_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ecommerce, public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Camino hoy poblado en staging/live ecommerce
  IF EXISTS (
    SELECT 1
    FROM ecommerce.user_profiles up
    WHERE up.id = v_uid
      AND lower(coalesce(up.role, '')) IN ('admin', 'super_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  -- Camino futuro compatible con roles por tienda
  IF EXISTS (
    SELECT 1
    FROM ecommerce.store_users su
    JOIN ecommerce.store_user_roles sur ON sur.store_user_id = su.id
    JOIN ecommerce.roles r ON r.id = sur.role_id
    WHERE su.user_id = v_uid
      AND lower(coalesce(r.role_name, '')) IN ('owner', 'admin', 'super_admin', 'store_admin')
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION ecommerce.is_component_styles_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ecommerce.is_component_styles_admin() TO authenticated;

ALTER TABLE ecommerce.component_styles ENABLE ROW LEVEL SECURITY;

GRANT INSERT, UPDATE, DELETE ON ecommerce.component_styles TO authenticated;

DROP POLICY IF EXISTS "Component styles public read" ON ecommerce.component_styles;
DROP POLICY IF EXISTS "Component styles admin insert" ON ecommerce.component_styles;
DROP POLICY IF EXISTS "Component styles admin update" ON ecommerce.component_styles;
DROP POLICY IF EXISTS "Component styles admin delete" ON ecommerce.component_styles;

CREATE POLICY "Component styles public read"
ON ecommerce.component_styles
FOR SELECT
TO public
USING (true);

CREATE POLICY "Component styles admin insert"
ON ecommerce.component_styles
FOR INSERT
TO authenticated
WITH CHECK (ecommerce.is_component_styles_admin());

CREATE POLICY "Component styles admin update"
ON ecommerce.component_styles
FOR UPDATE
TO authenticated
USING (ecommerce.is_component_styles_admin())
WITH CHECK (ecommerce.is_component_styles_admin());

CREATE POLICY "Component styles admin delete"
ON ecommerce.component_styles
FOR DELETE
TO authenticated
USING (ecommerce.is_component_styles_admin());

COMMIT;
