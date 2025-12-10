-- ============================================
-- SCRIPT PARA CREAR TABLAS DE PRODUCTOS GENÉRICAS
-- Diseñado para ser flexible y adaptable a diferentes tipos de tiendas
-- ============================================

-- ============================================
-- PASO 1: CREAR TABLA DE CATEGORÍAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.item_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(100) NOT NULL UNIQUE,
  category_description TEXT,
  category_image_url TEXT,
  parent_category_id UUID REFERENCES public.item_categories(id) ON DELETE SET NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para categorías
CREATE INDEX IF NOT EXISTS idx_item_categories_parent ON public.item_categories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_item_categories_active ON public.item_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_item_categories_order ON public.item_categories(display_order);

-- ============================================
-- PASO 2: CREAR TABLA PRINCIPAL DE PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.store_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_code VARCHAR(100) UNIQUE, -- Código SKU o identificador único del producto
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  item_description_html TEXT, -- Para descripciones con formato HTML
  category_id UUID REFERENCES public.item_categories(id) ON DELETE SET NULL,
  
  -- Precios
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  compare_at_price DECIMAL(10, 2), -- Precio anterior (para mostrar descuentos)
  currency_code VARCHAR(3) DEFAULT 'USD',
  
  -- Estado y disponibilidad
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  is_available_for_sale BOOLEAN DEFAULT TRUE,
  
  -- Inventario
  track_inventory BOOLEAN DEFAULT FALSE,
  inventory_quantity INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 10,
  
  -- SEO y URLs
  item_slug VARCHAR(255) UNIQUE, -- URL amigable (handle)
  seo_title VARCHAR(255),
  seo_description TEXT,
  
  -- Metadatos adicionales (JSON flexible para diferentes tipos de productos)
  metadata JSONB DEFAULT '{}'::jsonb, -- Para almacenar datos específicos por tipo de tienda
  
  -- Tags/Etiquetas
  tags TEXT[], -- Array de etiquetas para búsqueda y filtrado
  
  -- Imágenes
  primary_image_url TEXT,
  primary_image_alt TEXT,
  
  -- Orden y visualización
  display_order INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  
  -- Fechas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_store_items_category ON public.store_items(category_id);
CREATE INDEX IF NOT EXISTS idx_store_items_active ON public.store_items(is_active);
CREATE INDEX IF NOT EXISTS idx_store_items_featured ON public.store_items(is_featured);
CREATE INDEX IF NOT EXISTS idx_store_items_available ON public.store_items(is_available_for_sale);
CREATE INDEX IF NOT EXISTS idx_store_items_slug ON public.store_items(item_slug);
CREATE INDEX IF NOT EXISTS idx_store_items_code ON public.store_items(item_code);
CREATE INDEX IF NOT EXISTS idx_store_items_tags ON public.store_items USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_store_items_metadata ON public.store_items USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_store_items_order ON public.store_items(display_order);

-- ============================================
-- PASO 3: CREAR TABLA DE VARIANTES DE PRODUCTOS
-- ============================================
-- Para productos con opciones (tallas, colores, etc.)
CREATE TABLE IF NOT EXISTS public.item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  variant_code VARCHAR(100), -- SKU de la variante
  
  -- Precio específico de la variante (opcional, si difiere del precio base)
  price DECIMAL(10, 2),
  compare_at_price DECIMAL(10, 2),
  
  -- Opciones de la variante (JSON flexible)
  -- Ejemplo: {"size": "M", "color": "Azul"}
  variant_options JSONB DEFAULT '{}'::jsonb,
  
  -- Inventario específico de la variante
  track_inventory BOOLEAN DEFAULT FALSE,
  inventory_quantity INTEGER DEFAULT 0,
  
  -- Estado
  is_available BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Variante por defecto
  
  -- Imagen específica de la variante
  image_url TEXT,
  image_alt TEXT,
  
  -- Metadatos adicionales
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Fechas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint: solo una variante por defecto por producto
  CONSTRAINT unique_default_variant UNIQUE (item_id, is_default) DEFERRABLE INITIALLY DEFERRED
);

-- Índices para variantes
CREATE INDEX IF NOT EXISTS idx_item_variants_item ON public.item_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_item_variants_available ON public.item_variants(is_available);
CREATE INDEX IF NOT EXISTS idx_item_variants_code ON public.item_variants(variant_code);
CREATE INDEX IF NOT EXISTS idx_item_variants_options ON public.item_variants USING GIN(variant_options);

-- ============================================
-- PASO 4: CREAR TABLA DE IMÁGENES DE PRODUCTOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.item_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES public.store_items(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.item_variants(id) ON DELETE CASCADE,
  
  image_url TEXT NOT NULL,
  image_alt TEXT,
  image_title TEXT,
  
  -- Orden de visualización
  display_order INTEGER DEFAULT 0,
  
  -- Dimensiones (opcional)
  width INTEGER,
  height INTEGER,
  
  -- Tipo de imagen
  image_type VARCHAR(50) DEFAULT 'product', -- 'product', 'thumbnail', 'gallery', etc.
  
  -- Fechas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para imágenes
CREATE INDEX IF NOT EXISTS idx_item_images_item ON public.item_images(item_id);
CREATE INDEX IF NOT EXISTS idx_item_images_variant ON public.item_images(variant_id);
CREATE INDEX IF NOT EXISTS idx_item_images_order ON public.item_images(item_id, display_order);

-- ============================================
-- PASO 5: CREAR TABLA DE OPCIONES DE PRODUCTOS
-- ============================================
-- Para definir las opciones disponibles (Talla, Color, etc.)
CREATE TABLE IF NOT EXISTS public.item_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.store_items(id) ON DELETE CASCADE,
  option_name VARCHAR(100) NOT NULL, -- Ej: "Talla", "Color", "Material"
  option_values TEXT[] NOT NULL, -- Array de valores posibles
  display_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para opciones
CREATE INDEX IF NOT EXISTS idx_item_options_item ON public.item_options(item_id);
CREATE INDEX IF NOT EXISTS idx_item_options_order ON public.item_options(item_id, display_order);

-- ============================================
-- PASO 6: FUNCIONES Y TRIGGERS
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_store_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at en categorías
CREATE OR REPLACE FUNCTION update_item_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar updated_at en variantes
CREATE OR REPLACE FUNCTION update_item_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER trigger_update_store_items_updated_at
  BEFORE UPDATE ON public.store_items
  FOR EACH ROW
  EXECUTE FUNCTION update_store_items_updated_at();

CREATE TRIGGER trigger_update_item_categories_updated_at
  BEFORE UPDATE ON public.item_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_item_categories_updated_at();

CREATE TRIGGER trigger_update_item_variants_updated_at
  BEFORE UPDATE ON public.item_variants
  FOR EACH ROW
  EXECUTE FUNCTION update_item_variants_updated_at();

-- Trigger para asegurar que solo haya una variante por defecto
CREATE OR REPLACE FUNCTION ensure_single_default_variant()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE public.item_variants
    SET is_default = FALSE
    WHERE item_id = NEW.item_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_variant
  BEFORE INSERT OR UPDATE ON public.item_variants
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_variant();

-- ============================================
-- PASO 7: DESHABILITAR RLS (temporalmente para desarrollo)
-- ============================================
ALTER TABLE IF EXISTS public.item_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.item_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.item_images DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.item_options DISABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 8: DATOS DE EJEMPLO (OPCIONAL)
-- ============================================
-- Insertar algunas categorías de ejemplo
INSERT INTO public.item_categories (category_name, category_description, display_order) VALUES
  ('Sin categoría', 'Productos sin categoría específica', 0),
  ('Electrónica', 'Dispositivos y accesorios electrónicos', 1),
  ('Ropa', 'Prendas de vestir y accesorios', 2),
  ('Hogar', 'Artículos para el hogar', 3),
  ('Deportes', 'Equipamiento y accesorios deportivos', 4)
ON CONFLICT (category_name) DO NOTHING;

-- ============================================
-- PASO 9: VERIFICACIÓN
-- ============================================
-- Verificar que las tablas existen
SELECT 
  'Verificación Tablas' as paso,
  tablename,
  CASE 
    WHEN tablename IN ('item_categories', 'store_items', 'item_variants', 'item_images', 'item_options') 
    THEN '✅ Existe' 
    ELSE '❌ No existe' 
  END as estado
FROM pg_tables 
WHERE tablename IN ('item_categories', 'store_items', 'item_variants', 'item_images', 'item_options')
AND schemaname = 'public'
ORDER BY tablename;

-- Verificar triggers
SELECT 
  'Verificación Triggers' as paso,
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name IN (
  'trigger_update_store_items_updated_at',
  'trigger_update_item_categories_updated_at',
  'trigger_update_item_variants_updated_at',
  'trigger_ensure_single_default_variant'
)
ORDER BY trigger_name;





