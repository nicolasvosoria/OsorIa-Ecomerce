# Base de Datos de Productos - Estructura Genérica

## Descripción General

Esta estructura de base de datos está diseñada para ser **genérica y flexible**, permitiendo que la misma página de e-commerce pueda adaptarse a diferentes tipos de tiendas (ropa, electrónicos, alimentos, etc.) sin necesidad de modificar la estructura de la base de datos.

## Principio de Diseño

Se utilizan nombres genéricos como `item` (artículo) en lugar de `product` (producto) para que la estructura sea más universal y adaptable.

## Estructura de Tablas

### 1. `item_categories` - Categorías de Productos

Almacena las categorías que organizan los productos. Soporta categorías anidadas (subcategorías).

**Campos principales:**
- `category_name`: Nombre de la categoría
- `parent_category_id`: ID de la categoría padre (para subcategorías)
- `display_order`: Orden de visualización
- `is_active`: Si la categoría está activa

**Ejemplo de uso:**
```sql
-- Categoría principal
INSERT INTO item_categories (category_name, display_order) 
VALUES ('Ropa', 1);

-- Subcategoría
INSERT INTO item_categories (category_name, parent_category_id, display_order) 
VALUES ('Camisetas', (SELECT id FROM item_categories WHERE category_name = 'Ropa'), 1);
```

### 2. `store_items` - Productos Principales

Tabla principal que almacena todos los productos/artículos de la tienda.

**Campos principales:**
- `item_code`: Código SKU único del producto
- `item_name`: Nombre del producto
- `item_description`: Descripción en texto plano
- `item_description_html`: Descripción con formato HTML
- `category_id`: ID de la categoría
- `base_price`: Precio base del producto
- `compare_at_price`: Precio anterior (para mostrar descuentos)
- `currency_code`: Código de moneda (USD, EUR, etc.)
- `item_slug`: URL amigable (ej: "camiseta-azul-m")
- `is_active`: Si el producto está activo
- `is_featured`: Si es un producto destacado
- `is_available_for_sale`: Si está disponible para venta
- `track_inventory`: Si se debe rastrear inventario
- `inventory_quantity`: Cantidad en inventario
- `tags`: Array de etiquetas para búsqueda
- `metadata`: JSONB flexible para datos específicos por tipo de tienda

**Ejemplo de uso:**
```sql
-- Producto simple
INSERT INTO store_items (
  item_code, 
  item_name, 
  item_description, 
  base_price, 
  category_id,
  item_slug
) VALUES (
  'TSH-001',
  'Camiseta Básica Azul',
  'Camiseta de algodón 100% en color azul',
  29.99,
  (SELECT id FROM item_categories WHERE category_name = 'Ropa'),
  'camiseta-basica-azul'
);

-- Producto con metadatos específicos (ej: para ropa)
INSERT INTO store_items (
  item_code,
  item_name,
  base_price,
  metadata
) VALUES (
  'TSH-002',
  'Camiseta Premium',
  49.99,
  '{"material": "Algodón orgánico", "cuidado": "Lavable en máquina", "origen": "México"}'::jsonb
);
```

### 3. `item_variants` - Variantes de Productos

Almacena las diferentes variantes de un producto (tallas, colores, materiales, etc.).

**Campos principales:**
- `item_id`: ID del producto padre
- `variant_code`: SKU de la variante
- `price`: Precio específico (opcional, si difiere del precio base)
- `variant_options`: JSONB con las opciones (ej: `{"size": "M", "color": "Azul"}`)
- `inventory_quantity`: Inventario específico de la variante
- `is_default`: Si es la variante por defecto

**Ejemplo de uso:**
```sql
-- Variante de talla y color
INSERT INTO item_variants (
  item_id,
  variant_code,
  variant_options,
  inventory_quantity
) VALUES (
  (SELECT id FROM store_items WHERE item_code = 'TSH-001'),
  'TSH-001-M-AZUL',
  '{"size": "M", "color": "Azul"}'::jsonb,
  50
);
```

### 4. `item_images` - Imágenes de Productos

Almacena todas las imágenes asociadas a productos y variantes.

**Campos principales:**
- `item_id`: ID del producto
- `variant_id`: ID de la variante (opcional)
- `image_url`: URL de la imagen
- `image_alt`: Texto alternativo
- `display_order`: Orden de visualización
- `image_type`: Tipo de imagen ('product', 'thumbnail', 'gallery')

**Ejemplo de uso:**
```sql
-- Imagen principal del producto
INSERT INTO item_images (
  item_id,
  image_url,
  image_alt,
  display_order,
  image_type
) VALUES (
  (SELECT id FROM store_items WHERE item_code = 'TSH-001'),
  'https://example.com/images/camiseta-azul.jpg',
  'Camiseta Básica Azul',
  1,
  'product'
);
```

### 5. `item_options` - Opciones Disponibles

Define las opciones disponibles para un producto (Talla, Color, Material, etc.).

**Campos principales:**
- `item_id`: ID del producto
- `option_name`: Nombre de la opción (ej: "Talla", "Color")
- `option_values`: Array de valores posibles
- `is_required`: Si la opción es obligatoria
- `display_order`: Orden de visualización

**Ejemplo de uso:**
```sql
-- Opción de talla
INSERT INTO item_options (
  item_id,
  option_name,
  option_values,
  is_required
) VALUES (
  (SELECT id FROM store_items WHERE item_code = 'TSH-001'),
  'Talla',
  ARRAY['XS', 'S', 'M', 'L', 'XL'],
  true
);

-- Opción de color
INSERT INTO item_options (
  item_id,
  option_name,
  option_values,
  is_required
) VALUES (
  (SELECT id FROM store_items WHERE item_code = 'TSH-001'),
  'Color',
  ARRAY['Azul', 'Rojo', 'Verde', 'Negro'],
  true
);
```

## Campo `metadata` (JSONB) - Flexibilidad por Tipo de Tienda

El campo `metadata` permite almacenar información específica según el tipo de tienda:

### Para Tienda de Ropa:
```json
{
  "material": "Algodón 100%",
  "cuidado": "Lavable en máquina",
  "temporada": "Verano",
  "genero": "Unisex",
  "edad": "Adulto"
}
```

### Para Tienda de Electrónicos:
```json
{
  "marca": "Samsung",
  "modelo": "Galaxy S23",
  "especificaciones": {
    "pantalla": "6.1 pulgadas",
    "ram": "8GB",
    "almacenamiento": "128GB"
  },
  "garantia": "12 meses"
}
```

### Para Tienda de Alimentos:
```json
{
  "ingredientes": ["Harina", "Azúcar", "Huevos"],
  "alergenos": ["Gluten", "Huevos"],
  "caducidad": "2024-12-31",
  "peso": "500g",
  "origen": "España"
}
```

## Consultas Útiles

### Obtener todos los productos activos con sus categorías:
```sql
SELECT 
  si.id,
  si.item_code,
  si.item_name,
  si.base_price,
  si.currency_code,
  ic.category_name,
  si.primary_image_url
FROM store_items si
LEFT JOIN item_categories ic ON si.category_id = ic.id
WHERE si.is_active = TRUE 
  AND si.is_available_for_sale = TRUE
ORDER BY si.display_order, si.created_at DESC;
```

### Obtener producto con todas sus variantes:
```sql
SELECT 
  si.*,
  json_agg(
    json_build_object(
      'id', iv.id,
      'variant_code', iv.variant_code,
      'price', iv.price,
      'options', iv.variant_options,
      'inventory', iv.inventory_quantity,
      'available', iv.is_available
    )
  ) as variants
FROM store_items si
LEFT JOIN item_variants iv ON si.id = iv.item_id
WHERE si.item_slug = 'camiseta-basica-azul'
GROUP BY si.id;
```

### Obtener producto con todas sus imágenes:
```sql
SELECT 
  si.*,
  json_agg(
    json_build_object(
      'url', img.image_url,
      'alt', img.image_alt,
      'order', img.display_order
    ) ORDER BY img.display_order
  ) as images
FROM store_items si
LEFT JOIN item_images img ON si.id = img.item_id
WHERE si.item_slug = 'camiseta-basica-azul'
GROUP BY si.id;
```

## Ventajas de esta Estructura

1. **Genérica**: Los nombres de campos son universales (`item` en lugar de `product`)
2. **Flexible**: El campo `metadata` JSONB permite adaptarse a cualquier tipo de tienda
3. **Escalable**: Soporta productos simples y complejos con múltiples variantes
4. **SEO-friendly**: Incluye campos para SEO (slug, título, descripción)
5. **Inventario**: Sistema de inventario opcional por producto o variante
6. **Categorización**: Soporte para categorías anidadas
7. **Búsqueda**: Tags y metadatos indexados para búsquedas rápidas

## Próximos Pasos

1. Ejecutar el script `scripts/20-create-products-tables.sql` en Supabase
2. Crear funciones API en `lib/supabase/products-api.ts` para interactuar con estas tablas
3. Crear componentes React para mostrar productos desde la base de datos
4. Implementar búsqueda y filtrado usando los campos indexados


