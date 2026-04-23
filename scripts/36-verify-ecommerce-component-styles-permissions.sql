-- ============================================================
-- VERIFICACIÓN: ecommerce.component_styles permisos y RLS
-- Scope: SOLO schema ecommerce
-- ============================================================

-- 1) Helper debe existir en ecommerce
SELECT n.nspname AS schema_name, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'ecommerce'
  AND p.proname = 'is_component_styles_admin';

-- 2) Privilegios efectivos para authenticated
SELECT
  has_schema_privilege('authenticated', 'ecommerce', 'USAGE') AS auth_schema_usage,
  has_table_privilege('authenticated', 'ecommerce.component_styles', 'SELECT') AS auth_select,
  has_table_privilege('authenticated', 'ecommerce.component_styles', 'INSERT') AS auth_insert,
  has_table_privilege('authenticated', 'ecommerce.component_styles', 'UPDATE') AS auth_update,
  has_table_privilege('authenticated', 'ecommerce.component_styles', 'DELETE') AS auth_delete;

-- 3) RLS debe estar habilitado
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  c.relrowsecurity,
  c.relforcerowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'ecommerce'
  AND c.relname = 'component_styles';

-- 4) Policies esperadas
SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'ecommerce'
  AND tablename = 'component_styles'
ORDER BY policyname;

-- 5) Guard rail fail-closed
DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT count(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'ecommerce'
    AND tablename = 'component_styles'
    AND policyname IN (
      'Component styles public read',
      'Component styles admin insert',
      'Component styles admin update',
      'Component styles admin delete'
    );

  IF v_policy_count <> 4 THEN
    RAISE EXCEPTION 'FAIL: expected 4 component_styles policies, got %', v_policy_count;
  END IF;
END;
$$;
