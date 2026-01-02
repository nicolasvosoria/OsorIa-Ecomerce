-- ============================================
-- SCRIPT PARA CREAR TABLA DE TIENDAS (STORES)
-- Permite múltiples tiendas bajo diferentes subdominios
-- ============================================

-- Tabla principal de tiendas
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificación de la tienda
  subdomain VARCHAR(100) NOT NULL UNIQUE, -- Ej: 'electronica', 'ropa', 'alimentos'
  store_name VARCHAR(255) NOT NULL, -- Nombre de la tienda
  domain VARCHAR(255) NOT NULL DEFAULT 'tudominio.com', -- Dominio principal
  
  -- Estado
  is_active BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT TRUE, -- Si es false, requiere autenticación para ver
  
  -- Configuración de la tienda
  logo_url TEXT, -- URL del logo de la tienda
  favicon_url TEXT, -- URL del favicon
  primary_color VARCHAR(7), -- Color primario (hex)
  secondary_color VARCHAR(7), -- Color secundario (hex)
  
  -- Información de contacto
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  
  -- Configuración de checkout
  currency_code VARCHAR(3) DEFAULT 'COP',
  tax_rate DECIMAL(5, 2) DEFAULT 0, -- Tasa de impuestos (porcentaje)
  shipping_enabled BOOLEAN DEFAULT TRUE,
  free_shipping_threshold DECIMAL(10, 2), -- Monto mínimo para envío gratis
  
  -- SEO
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT[],
  
  -- Metadatos adicionales (JSON flexible)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Configuración de integraciones
  shopify_store_domain VARCHAR(255), -- Si usa Shopify para esta tienda
  shopify_access_token TEXT, -- Token de acceso a Shopify (encriptado)
  
  -- Fechas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE -- Soft delete
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_stores_subdomain ON public.stores(subdomain);
CREATE INDEX IF NOT EXISTS idx_stores_active ON public.stores(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_stores_domain ON public.stores(domain);
CREATE INDEX IF NOT EXISTS idx_stores_metadata ON public.stores USING GIN(metadata);

-- Tabla de relación Usuario-Tienda (para permisos)
CREATE TABLE IF NOT EXISTS public.store_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  
  -- Rol en la tienda
  role VARCHAR(50) DEFAULT 'manager', -- 'owner', 'admin', 'manager', 'staff'
  
  -- Permisos específicos
  can_manage_products BOOLEAN DEFAULT TRUE,
  can_manage_orders BOOLEAN DEFAULT TRUE,
  can_manage_settings BOOLEAN DEFAULT FALSE,
  can_manage_users BOOLEAN DEFAULT FALSE,
  
  -- Fechas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Un usuario solo puede tener un rol por tienda
  UNIQUE(store_id, user_id)
);

-- Índices para store_users
CREATE INDEX IF NOT EXISTS idx_store_users_store ON public.store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON public.store_users(user_id);
CREATE INDEX IF NOT EXISTS idx_store_users_role ON public.store_users(role);

-- Función para obtener la tienda por subdominio
CREATE OR REPLACE FUNCTION get_store_by_subdomain(p_subdomain VARCHAR)
RETURNS TABLE (
  id UUID,
  subdomain VARCHAR,
  store_name VARCHAR,
  domain VARCHAR,
  is_active BOOLEAN,
  is_public BOOLEAN,
  logo_url TEXT,
  primary_color VARCHAR,
  secondary_color VARCHAR,
  currency_code VARCHAR,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.subdomain,
    s.store_name,
    s.domain,
    s.is_active,
    s.is_public,
    s.logo_url,
    s.primary_color,
    s.secondary_color,
    s.currency_code,
    s.metadata
  FROM public.stores s
  WHERE s.subdomain = p_subdomain
    AND s.is_active = TRUE
    AND s.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar si un usuario tiene acceso a una tienda
CREATE OR REPLACE FUNCTION user_has_store_access(p_user_id UUID, p_store_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  has_access BOOLEAN := FALSE;
  user_role VARCHAR;
BEGIN
  -- Verificar si el usuario es super admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = p_user_id AND role = 'admin'
  ) INTO has_access;
  
  IF has_access THEN
    RETURN TRUE;
  END IF;
  
  -- Verificar si el usuario tiene acceso específico a la tienda
  SELECT EXISTS (
    SELECT 1 FROM public.store_users
    WHERE user_id = p_user_id AND store_id = p_store_id
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_stores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at();

CREATE TRIGGER update_store_users_updated_at
  BEFORE UPDATE ON public.store_users
  FOR EACH ROW
  EXECUTE FUNCTION update_stores_updated_at();

-- RLS (Row Level Security) - Deshabilitado por ahora, se puede habilitar después
ALTER TABLE IF EXISTS public.stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_users DISABLE ROW LEVEL SECURITY;

-- Insertar tienda por defecto (para migración)
INSERT INTO public.stores (subdomain, store_name, domain, is_active, is_public)
VALUES ('default', 'Tienda Principal', 'tudominio.com', TRUE, TRUE)
ON CONFLICT (subdomain) DO NOTHING;

-- Comentarios
COMMENT ON TABLE public.stores IS 'Tabla principal de tiendas para arquitectura multi-tenant';
COMMENT ON TABLE public.store_users IS 'Relación entre usuarios y tiendas con permisos específicos';
COMMENT ON FUNCTION get_store_by_subdomain IS 'Obtiene la información de una tienda por su subdominio';
COMMENT ON FUNCTION user_has_store_access IS 'Verifica si un usuario tiene acceso a una tienda específica';







