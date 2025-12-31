-- ============================================
-- ACTUALIZAR TEMA Y CONFIGURACIÓN DE REPOSTERÍA
-- Inspirado en el diseño de nicolukas.com
-- ============================================

-- Actualizar colores y configuración de la tienda de repostería
UPDATE public.stores
SET 
  primary_color = '#FF6B9D',        -- Rosa pastel principal
  secondary_color = '#FFE5F1',      -- Rosa claro
  seo_title = 'Tienda de Repostería - Pasteles Artesanales',
  seo_description = 'Deliciosos pasteles, postres y dulces artesanales. Hechos con amor y los mejores ingredientes.',
  metadata = jsonb_build_object(
    'theme', 'nicolukas-inspired',
    'font_primary', 'Playfair Display',
    'font_secondary', 'Inter',
    'style', 'elegant',
    'category', 'food'
  )
WHERE subdomain = 'reposteria';

-- Verificar actualización
SELECT 
  subdomain,
  store_name,
  primary_color,
  secondary_color,
  seo_title
FROM public.stores
WHERE subdomain = 'reposteria';



