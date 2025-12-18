-- ============================================
-- SCRIPT PARA INSERTAR PRODUCTOS DE EJEMPLO
-- Usa las categorías existentes en la base de datos
-- Las imágenes deben estar en Supabase Storage
-- ============================================
-- EJECUTA ESTE SCRIPT EN SUPABASE SQL EDITOR
-- Después de haber ejecutado todos los scripts de inicialización
--
-- IMPORTANTE: Antes de ejecutar este script, asegúrate de:
-- 1. Subir las imágenes a Supabase Storage en un bucket llamado 'products'
-- 2. Reemplazar '[TU_PROJECT_ID]' con tu Project ID de Supabase
-- 3. O usar la función storage_public_url() si está disponible

-- ============================================
-- CONFIGURACIÓN: IDs de categorías existentes
-- ============================================
-- Electrónica: 87e99446-ded3-4f91-8833-cf8f3d3e858a
-- Ropa: bfcb4e6c-e4b2-46d9-bcee-545567ff8e94
-- Hogar: 5e0adc54-08f8-4ce7-a0f8-31e41363afb9
-- Deportes: 552b665d-b63a-4e96-b7f1-f218a764b8d5
-- Sin categoría: 6d6dd7c9-f5c2-4d84-b90f-29e3ec145513

-- ============================================
-- CONFIGURACIÓN: Project ID de Supabase
-- ============================================
-- INSTRUCCIONES: Reemplaza 'TU_PROJECT_ID' en la función get_storage_url() con tu Project ID real
-- 
-- Para obtener tu Project ID:
-- 1. Ve a Supabase Dashboard → Settings → API
-- 2. Copia el "Project URL" (ejemplo: https://abcdefghijklmnop.supabase.co)
-- 3. Extrae solo la parte del ID: "abcdefghijklmnop"
-- 4. Reemplaza 'TU_PROJECT_ID' en la función get_storage_url() abajo

-- Función helper para construir URLs de Supabase Storage
-- ⚠️ IMPORTANTE: Reemplaza 'TU_PROJECT_ID' con tu Project ID real antes de ejecutar
CREATE OR REPLACE FUNCTION get_storage_url(path TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Formato: https://[PROJECT_ID].supabase.co/storage/v1/object/public/products/[PATH]
  -- ⚠️ REEMPLAZA 'TU_PROJECT_ID' con tu Project ID de Supabase (ejemplo: 'abcdefghijklmnop')
  RETURN 'https://qwwwnrjjmxpwppgipsug.supabase.co/storage/v1/object/public/products/' || path;
END;
$$ LANGUAGE plpgsql;

-- Obtener IDs de categorías existentes
DO $$
DECLARE
  v_electronica_cat_id UUID := '87e99446-ded3-4f91-8833-cf8f3d3e858a';
  v_ropa_cat_id UUID := 'bfcb4e6c-e4b2-46d9-bcee-545567ff8e94';
  v_hogar_cat_id UUID := '5e0adc54-08f8-4ce7-a0f8-31e41363afb9';
  v_deportes_cat_id UUID := '552b665d-b63a-4e96-b7f1-f218a764b8d5';
  v_sin_categoria_id UUID := '6d6dd7c9-f5c2-4d84-b90f-29e3ec145513';
  v_product_id UUID;
BEGIN

  -- ============================================
  -- PRODUCTOS DE ELECTRÓNICA
  -- ============================================

  -- Producto 1: Auriculares Premium
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'AUDIO-PREMIUM-001',
    'Auriculares Premium',
    'Auriculares de alta calidad con cancelación de ruido activa y sonido envolvente. Perfectos para música y trabajo.',
    '<p>Auriculares de alta calidad con cancelación de ruido activa y sonido envolvente. Perfectos para música y trabajo.</p>',
    v_electronica_cat_id,
    350000,
    420000,
    'COP',
    true,
    true,
    true,
    true,
    30,
    'auriculares-premium',
    'Auriculares Premium - Osoria',
    'Auriculares de alta calidad con cancelación de ruido activa.',
    get_storage_url('premium-headphones.png'),
    'Auriculares Premium',
    1,
    ARRAY['auriculares', 'audio', 'premium', 'cancelación-ruido']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('premium-headphones.png'), 'Auriculares Premium', 1, 'product'),
    (v_product_id, get_storage_url('woman-wearing-headphones-smiling.jpg'), 'Auriculares en uso', 2, 'product');

  INSERT INTO public.item_options (
    item_id,
    option_name,
    option_values,
    display_order,
    is_required
  ) VALUES
    (v_product_id, 'Color', ARRAY['Negro', 'Blanco', 'Azul'], 1, true);

  -- Eliminar variantes existentes del producto antes de insertar nuevas
  DELETE FROM public.item_variants WHERE item_id = v_product_id;
  
  -- Insertar variante por defecto
  INSERT INTO public.item_variants (
    item_id,
    variant_code,
    price,
    compare_at_price,
    variant_options,
    is_available,
    is_default
  ) VALUES
    (v_product_id, 'AUDIO-PREMIUM-BLK', 350000, 420000, '{"Color": "Negro"}'::jsonb, true, true);
  
  -- NOTA: La restricción unique_default_variant solo permite UNA variante con is_default=false por producto
  -- Por lo tanto, solo insertamos una variante adicional con is_default=false
  -- Las demás variantes (Blanco, Azul) se pueden agregar manualmente después si es necesario
  INSERT INTO public.item_variants (
    item_id,
    variant_code,
    price,
    compare_at_price,
    variant_options,
    is_available,
    is_default
  ) VALUES
    (v_product_id, 'AUDIO-PREMIUM-WHT', 350000, 420000, '{"Color": "Blanco"}'::jsonb, true, false);

  -- Producto 2: Altavoz Bluetooth
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'AUDIO-BT-SPEAKER-001',
    'Altavoz Bluetooth Moderno',
    'Altavoz Bluetooth con sonido potente y diseño moderno. Resistente al agua IPX7. Batería de larga duración.',
    '<p>Altavoz Bluetooth con sonido potente y diseño moderno. Resistente al agua IPX7. Batería de larga duración.</p>',
    v_electronica_cat_id,
    180000,
    220000,
    'COP',
    true,
    false,
    true,
    true,
    25,
    'altavoz-bluetooth-moderno',
    'Altavoz Bluetooth Moderno - Osoria',
    'Altavoz Bluetooth con sonido potente y diseño moderno.',
    get_storage_url('bluetooth-speaker-modern.jpg'),
    'Altavoz Bluetooth',
    2,
    ARRAY['altavoz', 'bluetooth', 'audio', 'portátil']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('bluetooth-speaker-modern.jpg'), 'Altavoz Bluetooth Moderno', 1, 'product'),
    (v_product_id, get_storage_url('bluetooth-speaker-black.jpg'), 'Altavoz Bluetooth Negro', 2, 'product');

  INSERT INTO public.item_options (
    item_id,
    option_name,
    option_values,
    display_order,
    is_required
  ) VALUES
    (v_product_id, 'Color', ARRAY['Negro', 'Blanco'], 1, true);

  -- Eliminar variantes existentes del producto antes de insertar nuevas
  DELETE FROM public.item_variants WHERE item_id = v_product_id;
  
  INSERT INTO public.item_variants (
    item_id,
    variant_code,
    price,
    compare_at_price,
    variant_options,
    is_available,
    is_default
  ) VALUES
    (v_product_id, 'BT-SPEAKER-BLK', 180000, 220000, '{"Color": "Negro"}'::jsonb, true, true),
    (v_product_id, 'BT-SPEAKER-WHT', 180000, 220000, '{"Color": "Blanco"}'::jsonb, true, false);

  -- Producto 3: Proyector Mini
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'PROJ-MINI-001',
    'Proyector Mini Portátil',
    'Proyector compacto y portátil con resolución HD. Perfecto para presentaciones y entretenimiento en casa.',
    '<p>Proyector compacto y portátil con resolución HD. Perfecto para presentaciones y entretenimiento en casa.</p>',
    v_electronica_cat_id,
    450000,
    550000,
    'COP',
    true,
    true,
    true,
    true,
    15,
    'proyector-mini-portatil',
    'Proyector Mini Portátil - Osoria',
    'Proyector compacto y portátil con resolución HD.',
    get_storage_url('mini-projector.jpg'),
    'Proyector Mini',
    3,
    ARRAY['proyector', 'portátil', 'HD', 'presentaciones']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('mini-projector.jpg'), 'Proyector Mini', 1, 'product'),
    (v_product_id, get_storage_url('white-projector.jpg'), 'Proyector Blanco', 2, 'product');

  -- Producto 4: Audífonos Inalámbricos
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'AUDIO-EARBUDS-001',
    'Audífonos Inalámbricos',
    'Audífonos inalámbricos con cancelación de ruido y calidad de sonido premium. Batería de larga duración.',
    '<p>Audífonos inalámbricos con cancelación de ruido y calidad de sonido premium. Batería de larga duración.</p>',
    v_electronica_cat_id,
    280000,
    350000,
    'COP',
    true,
    true,
    true,
    true,
    35,
    'audifonos-inalambricos',
    'Audífonos Inalámbricos - Osoria',
    'Audífonos inalámbricos con cancelación de ruido.',
    get_storage_url('green-earphones-product.jpg'),
    'Audífonos Inalámbricos',
    4,
    ARRAY['audífonos', 'inalámbricos', 'audio', 'premium']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('green-earphones-product.jpg'), 'Audífonos Inalámbricos', 1, 'product');

  INSERT INTO public.item_options (
    item_id,
    option_name,
    option_values,
    display_order,
    is_required
  ) VALUES
    (v_product_id, 'Color', ARRAY['Verde', 'Negro', 'Blanco'], 1, true);

  -- Eliminar variantes existentes del producto antes de insertar nuevas
  DELETE FROM public.item_variants WHERE item_id = v_product_id;
  
  INSERT INTO public.item_variants (
    item_id,
    variant_code,
    price,
    compare_at_price,
    variant_options,
    is_available,
    is_default
  ) VALUES
    (v_product_id, 'EARBUDS-GRN', 280000, 350000, '{"Color": "Verde"}'::jsonb, true, true),
    (v_product_id, 'EARBUDS-BLK', 280000, 350000, '{"Color": "Negro"}'::jsonb, true, false);

  -- ============================================
  -- PRODUCTOS DE HOGAR
  -- ============================================

  -- Producto 5: Soporte para Laptop
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'ACC-LAPTOP-STAND-001',
    'Soporte para Laptop Aluminio',
    'Soporte ergonómico para laptop en aluminio. Mejora la postura y la ventilación de tu dispositivo.',
    '<p>Soporte ergonómico para laptop en aluminio. Mejora la postura y la ventilación de tu dispositivo.</p>',
    v_hogar_cat_id,
    85000,
    100000,
    'COP',
    true,
    false,
    true,
    true,
    40,
    'soporte-laptop-aluminio',
    'Soporte para Laptop Aluminio - Osoria',
    'Soporte ergonómico para laptop en aluminio.',
    get_storage_url('laptop-stand-aluminum.jpg'),
    'Soporte para Laptop',
    1,
    ARRAY['soporte', 'laptop', 'ergonómico', 'aluminio']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('laptop-stand-aluminum.jpg'), 'Soporte para Laptop', 1, 'product'),
    (v_product_id, get_storage_url('laptop-stand.png'), 'Soporte para Laptop Vista Lateral', 2, 'product');

  -- Producto 6: Funda para Teléfono
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'ACC-PHONE-CASE-001',
    'Funda para Teléfono Moderna',
    'Funda protectora moderna con diseño elegante. Protección completa sin sacrificar el estilo.',
    '<p>Funda protectora moderna con diseño elegante. Protección completa sin sacrificar el estilo.</p>',
    v_hogar_cat_id,
    45000,
    55000,
    'COP',
    true,
    false,
    true,
    true,
    60,
    'funda-telefono-moderna',
    'Funda para Teléfono Moderna - Osoria',
    'Funda protectora moderna con diseño elegante.',
    get_storage_url('modern-phone-case-product.jpg'),
    'Funda para Teléfono',
    2,
    ARRAY['funda', 'teléfono', 'protección', 'accesorio']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('modern-phone-case-product.jpg'), 'Funda para Teléfono', 1, 'product');

  -- ============================================
  -- PRODUCTOS DE DEPORTES
  -- ============================================

  -- Producto 7: Altavoz Bluetooth Deportivo
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'SPORT-BT-SPEAKER-001',
    'Altavoz Bluetooth Deportivo',
    'Altavoz Bluetooth resistente al agua y golpes. Perfecto para actividades al aire libre y deportes.',
    '<p>Altavoz Bluetooth resistente al agua y golpes. Perfecto para actividades al aire libre y deportes.</p>',
    v_deportes_cat_id,
    150000,
    180000,
    'COP',
    true,
    true,
    true,
    true,
    20,
    'altavoz-bluetooth-deportivo',
    'Altavoz Bluetooth Deportivo - Osoria',
    'Altavoz Bluetooth resistente al agua y golpes.',
    get_storage_url('bluetooth-speaker-black.jpg'),
    'Altavoz Bluetooth Deportivo',
    1,
    ARRAY['altavoz', 'deportivo', 'resistente', 'agua']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('bluetooth-speaker-black.jpg'), 'Altavoz Bluetooth Deportivo', 1, 'product');

  -- ============================================
  -- PRODUCTOS SIN CATEGORÍA (Café y otros)
  -- ============================================

  -- Producto 8: Café Honey Process 454g
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'CAFE-HONEY-454',
    'Café Honey Process 454g',
    'Café de especialidad procesado con método Honey. Notas dulces y afrutadas con cuerpo medio.',
    '<p>Café de especialidad procesado con método Honey. Notas dulces y afrutadas con cuerpo medio.</p>',
    v_sin_categoria_id,
    45000,
    50000,
    'COP',
    true,
    true,
    true,
    true,
    50,
    'cafe-honey-process-454g',
    'Café Honey Process 454g - Osoria',
    'Café de especialidad procesado con método Honey. Notas dulces y afrutadas.',
    get_storage_url('coffee-bag-honey-454g.jpg'),
    'Café Honey Process 454g',
    1,
    ARRAY['café', 'honey', 'especialidad', 'colombia']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('coffee-bag-honey-454g.jpg'), 'Café Honey Process 454g', 1, 'product'),
    (v_product_id, get_storage_url('coffee-bag-honey-process-golden-packaging.jpg'), 'Embalaje dorado', 2, 'product');

  -- Eliminar variantes existentes del producto antes de insertar nuevas
  DELETE FROM public.item_variants WHERE item_id = v_product_id;
  
  INSERT INTO public.item_variants (
    item_id,
    variant_code,
    price,
    compare_at_price,
    is_available,
    is_default
  ) VALUES
    (v_product_id, 'HONEY-454', 45000, 50000, true, true),
    (v_product_id, 'HONEY-250', 25000, 28000, true, false);

  -- Producto 9: Café Natural Process 454g
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'CAFE-NATURAL-454',
    'Café Natural Process 454g',
    'Café procesado con método Natural. Notas frutales intensas y cuerpo completo.',
    '<p>Café procesado con método Natural. Notas frutales intensas y cuerpo completo.</p>',
    v_sin_categoria_id,
    42000,
    48000,
    'COP',
    true,
    true,
    true,
    true,
    45,
    'cafe-natural-process-454g',
    'Café Natural Process 454g - Osoria',
    'Café procesado con método Natural. Notas frutales intensas.',
    get_storage_url('coffee-bag-natural-process-brown-packaging.jpg'),
    'Café Natural Process 454g',
    2,
    ARRAY['café', 'natural', 'especialidad', 'colombia']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('coffee-bag-natural-process-brown-packaging.jpg'), 'Café Natural Process', 1, 'product'),
    (v_product_id, get_storage_url('coffee-bag-natural-250g-small.jpg'), 'Café Natural 250g', 2, 'product');

  -- Eliminar variantes existentes del producto antes de insertar nuevas
  DELETE FROM public.item_variants WHERE item_id = v_product_id;
  
  INSERT INTO public.item_variants (
    item_id,
    variant_code,
    price,
    compare_at_price,
    is_available,
    is_default
  ) VALUES
    (v_product_id, 'NATURAL-454', 42000, 48000, true, true),
    (v_product_id, 'NATURAL-250', 23000, 26000, true, false);

  -- Producto 10: Trilogía de Café (Set de 3 bolsas)
  INSERT INTO public.store_items (
    item_code,
    item_name,
    item_description,
    item_description_html,
    category_id,
    base_price,
    compare_at_price,
    currency_code,
    is_active,
    is_featured,
    is_available_for_sale,
    track_inventory,
    inventory_quantity,
    item_slug,
    seo_title,
    seo_description,
    primary_image_url,
    primary_image_alt,
    display_order,
    tags
  ) VALUES (
    'CAFE-TRILOGY-SET',
    'Trilogía de Café - Set de 3 Procesos',
    'Set especial con los tres métodos de procesamiento: Honey, Natural y Washed. Perfecto para degustar y comparar.',
    '<p>Set especial con los tres métodos de procesamiento: Honey, Natural y Washed. Perfecto para degustar y comparar.</p>',
    v_sin_categoria_id,
    120000,
    135000,
    'COP',
    true,
    true,
    true,
    true,
    20,
    'trilogia-cafe-set-3-procesos',
    'Trilogía de Café - Set de 3 Procesos - Osoria',
    'Set especial con los tres métodos de procesamiento de café.',
    get_storage_url('coffee-trilogy-set-three-bags-gift-box.jpg'),
    'Trilogía de Café',
    3,
    ARRAY['café', 'set', 'regalo', 'trilogía', 'especialidad']
  ) RETURNING id INTO v_product_id;

  INSERT INTO public.item_images (
    item_id,
    image_url,
    image_alt,
    display_order,
    image_type
  ) VALUES
    (v_product_id, get_storage_url('coffee-trilogy-set-three-bags-gift-box.jpg'), 'Trilogía de Café', 1, 'product');

END $$;

-- Limpiar función helper (opcional)
DROP FUNCTION IF EXISTS get_storage_url(TEXT);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecuta estas consultas para verificar que los productos se insertaron correctamente:

-- SELECT COUNT(*) as total_productos FROM public.store_items;
-- SELECT COUNT(*) as total_categorias FROM public.item_categories;
-- SELECT COUNT(*) as total_variantes FROM public.item_variants;
-- SELECT COUNT(*) as total_imagenes FROM public.item_images;
-- SELECT COUNT(*) as total_opciones FROM public.item_options;

-- Ver productos con sus categorías:
-- SELECT si.item_name, ic.category_name, si.base_price, si.is_featured
-- FROM public.store_items si
-- LEFT JOIN public.item_categories ic ON si.category_id = ic.id
-- ORDER BY si.display_order;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 1. ANTES de ejecutar este script, debes:
--    a) Subir todas las imágenes a Supabase Storage en un bucket llamado 'products'
--       - Ve a Storage en Supabase Dashboard
--       - Crea un bucket llamado 'products' (si no existe)
--       - Configura el bucket como público
--       - Sube todas las imágenes desde la carpeta /public del proyecto
--    b) Reemplazar 'TU_PROJECT_ID' en la función get_storage_url() (línea 30) con tu Project ID real
--
-- 2. Para obtener tu Project ID:
--    - Ve a tu proyecto en Supabase Dashboard
--    - Settings → API
--    - Copia el "Project URL" y extrae el ID (la parte antes de .supabase.co)
--
-- 3. Formato de URL de Supabase Storage:
--    https://[PROJECT_ID].supabase.co/storage/v1/object/public/[BUCKET_NAME]/[FILE_PATH]
--
-- 4. Ejemplo de URL real:
--    https://abcdefghijklmnop.supabase.co/storage/v1/object/public/products/premium-headphones.png
