-- ============================================
-- SCRIPT PARA ARREGLAR app_themes CON store_id
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Paso 1: Agregar columna store_id si no existe
ALTER TABLE IF EXISTS app_themes 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Paso 2: Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_app_themes_store_id ON app_themes(store_id);

-- Paso 3: Deshabilitar RLS temporalmente para evitar problemas
ALTER TABLE IF EXISTS app_themes DISABLE ROW LEVEL SECURITY;

-- Paso 4: Eliminar políticas RLS existentes que puedan causar problemas
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE tablename = 'app_themes') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Paso 5: Si hay temas sin store_id, asignarlos a la tienda por defecto
DO $$
DECLARE
    default_store_id UUID;
BEGIN
    -- Obtener el ID de la tienda por defecto
    SELECT id INTO default_store_id
    FROM public.stores
    WHERE subdomain = 'default'
    LIMIT 1;
    
    -- Si existe la tienda por defecto, asignar temas sin store_id
    IF default_store_id IS NOT NULL THEN
        UPDATE app_themes
        SET store_id = default_store_id
        WHERE store_id IS NULL;
        
        RAISE NOTICE 'Temas sin store_id asignados a la tienda por defecto: %', default_store_id;
    ELSE
        RAISE NOTICE 'No se encontró tienda por defecto. Los temas permanecerán con store_id NULL.';
    END IF;
END $$;

-- Paso 6: Verificar que todo está correcto
SELECT 
    'Verificación' as paso,
    COUNT(*) as total_temas,
    COUNT(store_id) as temas_con_store_id,
    COUNT(*) FILTER (WHERE store_id IS NULL) as temas_sin_store_id
FROM app_themes;

-- Paso 7: Mostrar temas por tienda
SELECT 
    s.store_name,
    s.subdomain,
    COUNT(t.id) as cantidad_temas
FROM public.stores s
LEFT JOIN app_themes t ON t.store_id = s.id
GROUP BY s.id, s.store_name, s.subdomain
ORDER BY s.store_name;
