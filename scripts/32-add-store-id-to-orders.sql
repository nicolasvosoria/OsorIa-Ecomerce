-- ============================================
-- MIGRACIÓN: Agregar store_id a tablas de pedidos
-- ============================================

-- 1. Agregar columna store_id a orders
ALTER TABLE IF EXISTS public.orders
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL;

-- 2. Asignar todos los pedidos existentes a la tienda por defecto
UPDATE public.orders
SET store_id = (SELECT id FROM public.stores WHERE subdomain = 'default' LIMIT 1)
WHERE store_id IS NULL;

-- 3. Agregar índice para búsquedas rápidas por tienda
CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store_status ON public.orders(store_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_store_date ON public.orders(store_id, order_date DESC);

-- Nota: No hacemos store_id NOT NULL porque puede haber pedidos históricos sin tienda
-- Para nuevos pedidos, siempre se debe asignar un store_id

-- Comentarios
COMMENT ON COLUMN public.orders.store_id IS 'ID de la tienda donde se realizó el pedido';










