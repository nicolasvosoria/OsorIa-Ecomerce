-- ============================================
-- MIGRACIÓN: Agregar store_id a tablas de productos
-- ============================================

-- 1. Agregar columna store_id a store_items
ALTER TABLE IF EXISTS public.store_items
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- 2. Asignar todos los productos existentes a la tienda por defecto
UPDATE public.store_items
SET store_id = (SELECT id FROM public.stores WHERE subdomain = 'default' LIMIT 1)
WHERE store_id IS NULL;

-- 3. Hacer store_id NOT NULL después de asignar valores
ALTER TABLE IF EXISTS public.store_items
ALTER COLUMN store_id SET NOT NULL;

-- 4. Agregar índice para búsquedas rápidas por tienda
CREATE INDEX IF NOT EXISTS idx_store_items_store ON public.store_items(store_id);
CREATE INDEX IF NOT EXISTS idx_store_items_store_active ON public.store_items(store_id, is_active) WHERE is_active = TRUE;

-- 5. Agregar store_id a item_categories
ALTER TABLE IF EXISTS public.item_categories
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Asignar categorías existentes a la tienda por defecto
UPDATE public.item_categories
SET store_id = (SELECT id FROM public.stores WHERE subdomain = 'default' LIMIT 1)
WHERE store_id IS NULL;

ALTER TABLE IF EXISTS public.item_categories
ALTER COLUMN store_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_item_categories_store ON public.item_categories(store_id);

-- 6. Agregar store_id a item_variants (heredado del item)
-- No es necesario agregar store_id directamente, se obtiene del item_id
-- Pero podemos agregar un índice compuesto para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_item_variants_store ON public.item_variants(item_id, id);

-- 7. Agregar store_id a item_images (heredado del item)
-- Similar a variants, se obtiene del item_id

-- 8. Agregar store_id a item_options (heredado del item)
-- Similar a variants, se obtiene del item_id

-- Comentarios
COMMENT ON COLUMN public.store_items.store_id IS 'ID de la tienda a la que pertenece el producto';
COMMENT ON COLUMN public.item_categories.store_id IS 'ID de la tienda a la que pertenece la categoría';



