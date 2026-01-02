-- ============================================
-- SCRIPT PARA CREAR TABLAS DE PEDIDOS (ORDERS)
-- Almacena pedidos de clientes (con cuenta y sin cuenta)
-- ============================================

-- ============================================
-- PASO 1: CREAR TABLA PRINCIPAL DE PEDIDOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información del pedido
  order_number VARCHAR(50) UNIQUE NOT NULL, -- Número de pedido único (ej: ORD-2025-001)
  order_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, processing, shipped, delivered, cancelled
  
  -- Información del cliente
  customer_type VARCHAR(20) DEFAULT 'guest', -- 'guest' o 'user' (si tiene cuenta)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL si es guest
  customer_email VARCHAR(255) NOT NULL,
  customer_first_name VARCHAR(100) NOT NULL,
  customer_last_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(50),
  
  -- Dirección de envío
  shipping_address TEXT NOT NULL,
  shipping_city VARCHAR(100) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(100) NOT NULL DEFAULT 'Colombia',
  shipping_notes TEXT, -- Notas adicionales del cliente
  
  -- Información de pago
  payment_method VARCHAR(50), -- cash_on_delivery, credit_card, debit_card, etc.
  payment_status VARCHAR(50) DEFAULT 'pending', -- pending, paid, failed, refunded
  payment_reference VARCHAR(255), -- Referencia de pago externa
  
  -- Totales del pedido
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  shipping_cost DECIMAL(10, 2) DEFAULT 0,
  tax_amount DECIMAL(10, 2) DEFAULT 0,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency_code VARCHAR(3) DEFAULT 'COP',
  
  -- Información adicional
  notes TEXT, -- Notas internas del pedido
  metadata JSONB DEFAULT '{}'::jsonb, -- Datos adicionales flexibles
  
  -- Fechas de seguimiento
  confirmed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Fechas de auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para pedidos
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON public.orders(order_date DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_type ON public.orders(customer_type);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

-- ============================================
-- PASO 2: CREAR TABLA DE ITEMS DEL PEDIDO
-- ============================================
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  
  -- Información del producto
  product_id UUID REFERENCES public.store_items(id) ON DELETE SET NULL, -- NULL si el producto fue eliminado
  product_name VARCHAR(255) NOT NULL, -- Nombre del producto al momento del pedido
  product_sku VARCHAR(100), -- SKU del producto
  
  -- Variante del producto (si aplica)
  variant_id UUID REFERENCES public.item_variants(id) ON DELETE SET NULL,
  variant_title VARCHAR(255), -- Título de la variante al momento del pedido
  
  -- Información de precio (precio al momento del pedido)
  unit_price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL, -- unit_price * quantity
  currency_code VARCHAR(3) DEFAULT 'COP',
  
  -- Información adicional del producto
  product_image_url TEXT, -- URL de la imagen del producto
  product_slug VARCHAR(255), -- Slug del producto para referencia
  
  -- Opciones seleccionadas (si el producto tiene opciones)
  selected_options JSONB DEFAULT '{}'::jsonb, -- { "Talla": "M", "Color": "Azul" }
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Fechas de auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para items del pedido
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON public.order_items(variant_id);

-- ============================================
-- PASO 3: CREAR FUNCIÓN PARA GENERAR NÚMERO DE PEDIDO
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  sequence_num INTEGER;
  order_num TEXT;
BEGIN
  -- Obtener el año actual
  year_part := TO_CHAR(NOW(), 'YYYY');
  
  -- Obtener el siguiente número de secuencia para este año
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.orders
  WHERE order_number LIKE 'ORD-' || year_part || '-%';
  
  -- Formatear el número de pedido: ORD-YYYY-XXX
  order_num := 'ORD-' || year_part || '-' || LPAD(sequence_num::TEXT, 6, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PASO 4: CREAR TRIGGER PARA ACTUALIZAR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para orders
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para order_items
DROP TRIGGER IF EXISTS update_order_items_updated_at ON public.order_items;
CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PASO 5: CREAR TRIGGER PARA GENERAR NÚMERO DE PEDIDO AUTOMÁTICAMENTE
-- ============================================
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_number_trigger ON public.orders;
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION set_order_number();

-- ============================================
-- PASO 6: DESHABILITAR RLS (temporalmente para facilitar desarrollo)
-- ============================================
ALTER TABLE IF EXISTS public.orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 7: VERIFICACIÓN
-- ============================================
-- Verificar que las tablas existen
SELECT 
  'Verificación Tablas' as paso,
  tablename,
  CASE 
    WHEN tablename IN ('orders', 'order_items') THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END as estado
FROM pg_tables 
WHERE tablename IN ('orders', 'order_items')
AND schemaname = 'public';

-- Verificar triggers
SELECT 
  'Verificación Triggers' as paso,
  trigger_name,
  event_object_table,
  CASE 
    WHEN trigger_name IN ('update_orders_updated_at', 'update_order_items_updated_at', 'set_order_number_trigger') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END as estado
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN ('update_orders_updated_at', 'update_order_items_updated_at', 'set_order_number_trigger');

-- Verificar función
SELECT 
  'Verificación Función' as paso,
  routine_name,
  CASE 
    WHEN routine_name = 'generate_order_number' THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'generate_order_number';








