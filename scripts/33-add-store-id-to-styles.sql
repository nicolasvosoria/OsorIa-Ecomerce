-- ============================================
-- MIGRACIÓN: Agregar store_id a tablas de estilos
-- ============================================

-- 1. Agregar columna store_id a component_styles
ALTER TABLE IF EXISTS public.component_styles
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- 2. Asignar todos los estilos existentes a la tienda por defecto
UPDATE public.component_styles
SET store_id = (SELECT id FROM public.stores WHERE subdomain = 'default' LIMIT 1)
WHERE store_id IS NULL;

-- 3. Hacer store_id NOT NULL después de asignar valores
ALTER TABLE IF EXISTS public.component_styles
ALTER COLUMN store_id SET NOT NULL;

-- 4. Modificar la restricción única para incluir store_id
-- Primero eliminar la restricción única existente si existe
ALTER TABLE IF EXISTS public.component_styles
DROP CONSTRAINT IF EXISTS component_styles_component_name_key;

-- Crear nueva restricción única que incluye store_id
ALTER TABLE IF EXISTS public.component_styles
ADD CONSTRAINT component_styles_component_store_unique UNIQUE (component_name, store_id);

-- 5. Agregar índice para búsquedas rápidas por tienda
CREATE INDEX IF NOT EXISTS idx_component_styles_store ON public.component_styles(store_id);
CREATE INDEX IF NOT EXISTS idx_component_styles_store_component ON public.component_styles(store_id, component_name);

-- 6. Agregar store_id a themes (opcional, si quieres temas por tienda)
-- Verificar si la tabla existe antes de modificarla
DO $$
BEGIN
  -- Verificar si existe la tabla app_themes (nombre correcto)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_themes') THEN
    -- Agregar columna store_id
    ALTER TABLE public.app_themes
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

    -- Asignar temas existentes a la tienda por defecto
    UPDATE public.app_themes
    SET store_id = (SELECT id FROM public.stores WHERE subdomain = 'default' LIMIT 1)
    WHERE store_id IS NULL;

    -- Crear índice
    CREATE INDEX IF NOT EXISTS idx_app_themes_store ON public.app_themes(store_id);
    
    RAISE NOTICE 'Columna store_id agregada a app_themes';
  ELSE
    RAISE NOTICE 'Tabla app_themes no existe, omitiendo modificación';
  END IF;
END $$;

-- 7. Agregar store_id a fonts (opcional, si quieres fuentes por tienda)
-- Verificar si la tabla existe antes de modificarla
DO $$
BEGIN
  -- Verificar si existe la tabla app_fonts (nombre correcto)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_fonts') THEN
    -- Agregar columna store_id
    ALTER TABLE public.app_fonts
    ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

    -- Asignar fuentes existentes a la tienda por defecto
    UPDATE public.app_fonts
    SET store_id = (SELECT id FROM public.stores WHERE subdomain = 'default' LIMIT 1)
    WHERE store_id IS NULL;

    -- Crear índice
    CREATE INDEX IF NOT EXISTS idx_app_fonts_store ON public.app_fonts(store_id);
    
    RAISE NOTICE 'Columna store_id agregada a app_fonts';
  ELSE
    RAISE NOTICE 'Tabla app_fonts no existe, omitiendo modificación';
  END IF;
END $$;

-- Comentarios
COMMENT ON COLUMN public.component_styles.store_id IS 'ID de la tienda a la que pertenecen los estilos del componente';

-- Comentarios para app_themes y app_fonts (solo si las tablas existen)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_themes') THEN
    COMMENT ON COLUMN public.app_themes.store_id IS 'ID de la tienda a la que pertenece el tema (NULL = global)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_fonts') THEN
    COMMENT ON COLUMN public.app_fonts.store_id IS 'ID de la tienda a la que pertenece la fuente (NULL = global)';
  END IF;
END $$;



