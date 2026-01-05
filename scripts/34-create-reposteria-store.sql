-- ============================================
-- SCRIPT PARA CREAR TIENDA DE REPOSTERÍA
-- Ejecutar DESPUÉS de los scripts 30-33
-- ============================================

-- 1. Crear la tienda de repostería
INSERT INTO public.stores (
  subdomain,
  store_name,
  domain,
  is_active,
  is_public,
  logo_url,
  primary_color,
  secondary_color,
  contact_email,
  currency_code,
  seo_title,
  seo_description,
  metadata
) VALUES (
  'reposteria',                    -- Subdominio: reposteria.tudominio.com
  'Tienda de Repostería',          -- Nombre de la tienda
  'tudominio.com',                 -- Cambiar por tu dominio real
  TRUE,                            -- Tienda activa
  TRUE,                            -- Tienda pública
  NULL,                            -- Logo (agregar URL después)
  '#FF6B9D',                       -- Color primario (rosa pastel)
  '#FFE5F1',                       -- Color secundario (rosa claro)
  'reposteria@tudominio.com',      -- Email de contacto
  'COP',                           -- Moneda
  'Tienda de Repostería - Pasteles, Postres y Más',
  'Encuentra los mejores pasteles, postres, galletas y dulces. Repostería artesanal de calidad.',
  '{"theme": "sweet", "category": "food"}'::jsonb
) ON CONFLICT (subdomain) DO UPDATE SET
  store_name = EXCLUDED.store_name,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- 2. Crear categorías para la tienda de repostería
-- Primero obtener el ID de la tienda de repostería
DO $$
DECLARE
  reposteria_store_id UUID;
BEGIN
  -- Obtener el ID de la tienda de repostería
  SELECT id INTO reposteria_store_id
  FROM public.stores
  WHERE subdomain = 'reposteria'
  LIMIT 1;

  IF reposteria_store_id IS NOT NULL THEN
    -- Crear categorías de repostería
    INSERT INTO public.item_categories (
      store_id,
      category_name,
      category_description,
      display_order,
      is_active
    ) VALUES
      (reposteria_store_id, 'Pasteles', 'Pasteles de todos los sabores y tamaños', 1, TRUE),
      (reposteria_store_id, 'Cupcakes', 'Cupcakes decorados y deliciosos', 2, TRUE),
      (reposteria_store_id, 'Galletas', 'Galletas artesanales y personalizadas', 3, TRUE),
      (reposteria_store_id, 'Postres', 'Postres individuales y porciones', 4, TRUE),
      (reposteria_store_id, 'Tartas', 'Tartas dulces y saladas', 5, TRUE),
      (reposteria_store_id, 'Brownies', 'Brownies y barras de chocolate', 6, TRUE)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 3. Verificar que se creó correctamente
SELECT 
  id,
  subdomain,
  store_name,
  is_active,
  created_at
FROM public.stores
WHERE subdomain = 'reposteria';

-- 4. Ver las categorías creadas
SELECT 
  ic.category_name,
  ic.display_order,
  s.store_name
FROM public.item_categories ic
JOIN public.stores s ON ic.store_id = s.id
WHERE s.subdomain = 'reposteria'
ORDER BY ic.display_order;

-- Comentario final
COMMENT ON TABLE public.stores IS 'Tienda de repostería creada. Accesible en: reposteria.tudominio.com';







