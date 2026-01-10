# Tablas e Información Consultada en la Base de Datos

## Resumen de Tablas Consultadas

El ecommerce consulta las siguientes tablas en Supabase:

1. **orders** - Pedidos
2. **order_items** - Items de pedidos
3. **user_profiles** - Perfiles de usuarios
4. **store_items** - Productos de la tienda
5. **item_categories** - Categorías de productos
6. **item_variants** - Variantes de productos
7. **item_images** - Imágenes de productos
8. **item_options** - Opciones de productos (tallas, colores, etc.)
9. **stores** - Tiendas (multi-tenant)
10. **app_themes** - Temas de la aplicación
11. **app_fonts** - Fuentes disponibles
12. **component_styles** - Estilos de componentes

---

## 1. TABLA: `orders` (Pedidos)

### Campos Consultados:
- `id` - Identificador único del pedido
- `order_number` - Número único del pedido (ej: ORD-2025-001)
- `order_date` - Fecha del pedido
- `created_at` - Fecha de creación (usado para estadísticas)
- `status` - Estado del pedido (pending, confirmed, processing, shipped, delivered, cancelled)
- `customer_type` - Tipo de cliente (guest, user)
- `user_id` - ID del usuario (si tiene cuenta, null si es invitado)
- `customer_email` - Email del cliente
- `customer_first_name` - Nombre del cliente
- `customer_last_name` - Apellido del cliente
- `customer_phone` - Teléfono del cliente
- `shipping_address` - Dirección de envío
- `shipping_city` - Ciudad de envío
- `shipping_postal_code` - Código postal
- `shipping_country` - País de envío
- `shipping_notes` - Notas de envío
- `payment_method` - Método de pago
- `payment_status` - Estado del pago (pending, paid, failed, refunded)
- `payment_reference` - Referencia de pago externa
- `subtotal` - Subtotal del pedido
- `shipping_cost` - Costo de envío
- `tax_amount` - Impuestos
- `discount_amount` - Descuentos aplicados
- `total_amount` - Total del pedido
- `currency_code` - Código de moneda (COP, USD, etc.)
- `notes` - Notas internas
- `metadata` - Metadatos adicionales (JSONB)
- `confirmed_at` - Fecha de confirmación
- `shipped_at` - Fecha de envío
- `delivered_at` - Fecha de entrega
- `cancelled_at` - Fecha de cancelación
- `updated_at` - Fecha de última actualización

### Operaciones Realizadas:
- **Crear pedidos**: `createOrder()`
- **Obtener pedido por ID**: `getOrderById()`
- **Obtener pedido por número**: `getOrderByNumber()`
- **Listar pedidos**: `getOrders()` con filtros por estado, fecha, paginación
- **Actualizar pedido**: `updateOrder()`
- **Estadísticas**: Ventas por día, total de pedidos, pedidos por estado

### Filtros Comunes:
- Por fecha: `gte('created_at', fechaInicio)`
- Por estado: `eq('status', status)`
- Por estado de pago: `eq('payment_status', status)`
- Por usuario: `eq('user_id', userId)`

---

## 2. TABLA: `order_items` (Items de Pedidos)

### Campos Consultados:
- `id` - Identificador único del item
- `order_id` - ID del pedido (FK a orders)
- `product_id` - ID del producto (FK a store_items, puede ser null si el producto fue eliminado)
- `product_name` - Nombre del producto al momento del pedido
- `product_sku` - SKU del producto
- `variant_id` - ID de la variante (FK a item_variants)
- `variant_title` - Título de la variante
- `unit_price` - Precio unitario al momento del pedido
- `quantity` - Cantidad vendida
- `total_price` - Precio total (unit_price * quantity)
- `currency_code` - Código de moneda
- `product_image_url` - URL de la imagen del producto
- `product_slug` - Slug del producto para referencia
- `selected_options` - Opciones seleccionadas (JSONB, ej: { "Talla": "M", "Color": "Azul" })
- `metadata` - Metadatos adicionales (JSONB)
- `created_at` - Fecha de creación (usado para estadísticas de productos vendidos)

### Operaciones Realizadas:
- **Crear items de pedido**: Al crear un pedido, se insertan todos sus items
- **Obtener items de un pedido**: `getOrderById()` incluye los items
- **Estadísticas**: Top productos más vendidos (agrupados por product_id)

### Relaciones:
- `orders!inner(created_at)` - Join con orders para filtrar por fecha del pedido

---

## 3. TABLA: `user_profiles` (Perfiles de Usuarios)

### Campos Consultados:
- `id` - Identificador único (FK a auth.users)
- `email` - Email del usuario
- `first_name` - Nombre
- `last_name` - Apellido
- `role` - Rol del usuario (user, admin)
- `created_at` - Fecha de registro
- `updated_at` - Fecha de última actualización
- Todos los campos (`*`) para obtener perfil completo

### Operaciones Realizadas:
- **Obtener perfil actual**: `getCurrentUser()`
- **Obtener perfil por ID**: `getUserProfile()`, `getUserById()`
- **Listar usuarios**: `getUsers()` con filtros por rol, paginación, ordenamiento
- **Actualizar perfil**: `updateUserProfile()`
- **Verificar permisos**: `isCurrentUserAdmin()`, `getCurrentUserRole()`
- **Estadísticas**: Total de usuarios registrados

### Filtros Comunes:
- Por ID: `eq('id', userId)`
- Por rol: `eq('role', 'admin' | 'user')`
- Por email: `eq('email', email)`

---

## 4. TABLA: `store_items` (Productos)

### Campos Consultados:
- `id` - Identificador único del producto
- `item_code` - Código SKU único
- `item_name` - Nombre del producto
- `item_description` - Descripción del producto
- `item_description_html` - Descripción en HTML
- `category_id` - ID de la categoría (FK a item_categories)
- `base_price` - Precio base
- `compare_at_price` - Precio de comparación (para mostrar descuentos)
- `currency_code` - Código de moneda
- `is_active` - Si el producto está activo
- `is_featured` - Si es producto destacado
- `is_available_for_sale` - Si está disponible para venta
- `track_inventory` - Si se rastrea inventario
- `inventory_quantity` - Cantidad en inventario
- `low_stock_threshold` - Umbral de stock bajo
- `item_slug` - URL amigable (handle)
- `seo_title` - Título SEO
- `seo_description` - Descripción SEO
- `metadata` - Metadatos adicionales (JSONB)
- `tags` - Array de etiquetas
- `primary_image_url` - URL de imagen principal
- `primary_image_alt` - Texto alternativo de imagen
- `display_order` - Orden de visualización
- `view_count` - Contador de visualizaciones
- `store_id` - ID de la tienda (FK a stores)
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Operaciones Realizadas:
- **Listar productos**: `getItems()` con múltiples filtros (categoría, activos, destacados, búsqueda, tags, paginación)
- **Obtener producto por ID**: `getItemById()`
- **Obtener producto por slug**: `getItemBySlug()`
- **Crear producto**: `createItem()`
- **Actualizar producto**: `updateItem()`
- **Eliminar producto**: `deleteItem()`
- **Incrementar visualizaciones**: `incrementItemViewCount()`
- **Estadísticas**: Total de productos activos

### Filtros Comunes:
- Por tienda: `eq('store_id', storeId)`
- Por categoría: `eq('category_id', categoryId)`
- Por estado: `eq('is_active', true)`
- Por destacados: `eq('is_featured', true)`
- Por disponibilidad: `eq('is_available_for_sale', true)`
- Búsqueda por nombre: `ilike('item_name', '%search%')`
- Por tags: `contains('tags', [tag])`

---

## 5. TABLA: `item_categories` (Categorías)

### Campos Consultados:
- `id` - Identificador único
- `category_name` - Nombre de la categoría
- `category_description` - Descripción
- `category_slug` - URL amigable
- `parent_category_id` - ID de categoría padre (para jerarquías)
- `display_order` - Orden de visualización
- `is_active` - Si está activa
- `store_id` - ID de la tienda (FK a stores)
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Operaciones Realizadas:
- **Listar categorías**: `getCategories()` con filtro por tienda y estado activo
- **Obtener categoría por ID**: `getCategoryById()`

### Filtros Comunes:
- Por tienda: `eq('store_id', storeId)`
- Por estado: `eq('is_active', true)`
- Orden: `order('display_order', { ascending: true })`

---

## 6. TABLA: `item_variants` (Variantes de Productos)

### Campos Consultados:
- `id` - Identificador único
- `item_id` - ID del producto (FK a store_items)
- `variant_name` - Nombre de la variante
- `sku` - SKU de la variante
- `price` - Precio de la variante
- `compare_at_price` - Precio de comparación
- `inventory_quantity` - Cantidad en inventario
- `is_available` - Si está disponible
- `display_order` - Orden de visualización
- `metadata` - Metadatos adicionales (JSONB)
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Operaciones Realizadas:
- **Obtener variantes de un producto**: `getItemById()` incluye las variantes
- Se consulta siempre junto con `store_items`

### Filtros Comunes:
- Por producto: `eq('item_id', itemId)`
- Orden: `order('display_order', { ascending: true })`

---

## 7. TABLA: `item_images` (Imágenes de Productos)

### Campos Consultados:
- `id` - Identificador único
- `item_id` - ID del producto (FK a store_items)
- `image_url` - URL de la imagen
- `image_alt` - Texto alternativo
- `display_order` - Orden de visualización
- `is_primary` - Si es imagen principal
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Operaciones Realizadas:
- **Obtener imágenes de un producto**: `getItemById()` incluye las imágenes
- **Crear imágenes**: Al crear/actualizar productos
- **Eliminar imágenes**: Al actualizar productos

### Filtros Comunes:
- Por producto: `eq('item_id', itemId)`
- Orden: `order('display_order', { ascending: true })`

---

## 8. TABLA: `item_options` (Opciones de Productos)

### Campos Consultados:
- `id` - Identificador único
- `item_id` - ID del producto (FK a store_items)
- `option_name` - Nombre de la opción (ej: "Talla", "Color")
- `option_values` - Valores de la opción (JSONB array, ej: ["S", "M", "L"])
- `display_order` - Orden de visualización
- `is_required` - Si es requerida
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización

### Operaciones Realizadas:
- **Obtener opciones de un producto**: `getItemById()` incluye las opciones
- **Crear opciones**: Al crear/actualizar productos

### Filtros Comunes:
- Por producto: `eq('item_id', itemId)`
- Orden: `order('display_order', { ascending: true })`

---

## 9. TABLA: `stores` (Tiendas - Multi-tenant)

### Campos Consultados:
- `id` - Identificador único (UUID)
- `subdomain` - Subdominio de la tienda (ej: "default")
- `store_name` - Nombre de la tienda
- `primary_color` - Color primario de la tienda
- `secondary_color` - Color secundario
- `is_active` - Si la tienda está activa
- `deleted_at` - Fecha de eliminación (soft delete)

### Operaciones Realizadas:
- **Obtener tienda por subdomain**: Buscar tienda por defecto cuando no hay store_id
- **Obtener tienda por ID**: `getStoreFromServer()`
- **Usado como filtro**: Todas las consultas de productos, categorías, etc. se filtran por `store_id`

### Filtros Comunes:
- Por subdomain: `eq('subdomain', 'default')`
- Por ID: `eq('id', storeId)`
- Por estado: `eq('is_active', true)`
- No eliminadas: `is('deleted_at', null)`

---

## 10. TABLA: `app_themes` (Temas de la Aplicación)

### Campos Consultados:
- `id` - Identificador único
- `theme_name` - Nombre del tema
- `theme_config` - Configuración del tema (JSONB)
- `store_id` - ID de la tienda (FK a stores)
- `is_active` - Si está activo
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización
- Todos los campos (`*`) para obtener configuración completa

### Operaciones Realizadas:
- **Listar temas**: `getThemes()` con filtro por tienda
- **Obtener tema activo**: Filtrar por `is_active = true`
- **Crear/actualizar temas**: Gestión de temas desde admin

### Filtros Comunes:
- Por tienda: `eq('store_id', storeId)`
- Por nombre: `order('theme_name')`
- Por estado: `eq('is_active', true)`

---

## 11. TABLA: `app_fonts` (Fuentes)

### Campos Consultados:
- `id` - Identificador único
- `font_name` - Nombre de la fuente
- `font_family` - Familia de fuente CSS
- `font_url` - URL de la fuente (Google Fonts, etc.)
- `is_system` - Si es fuente del sistema
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización
- Todos los campos (`*`) para obtener información completa

### Operaciones Realizadas:
- **Listar fuentes**: `getFonts()` ordenadas por nombre
- **Obtener fuente por ID**: Para aplicar fuentes específicas
- **Crear/actualizar fuentes**: Gestión desde admin

### Filtros Comunes:
- Orden: `order('font_name')`
- Por tipo: `eq('is_system', true/false)`

---

## 12. TABLA: `component_styles` (Estilos de Componentes)

### Campos Consultados:
- `id` - Identificador único
- `component_name` - Nombre del componente
- `style_config` - Configuración de estilos (JSONB)
- `store_id` - ID de la tienda (FK a stores)
- `is_active` - Si está activo
- `created_at` - Fecha de creación
- `updated_at` - Fecha de actualización
- Todos los campos (`*`) para obtener estilos completos

### Operaciones Realizadas:
- **Obtener estilos de componentes**: `getComponentStyles()` con filtro por tienda
- **Aplicar estilos**: Para personalizar la apariencia de componentes específicos
- **Crear/actualizar estilos**: Gestión desde admin

### Filtros Comunes:
- Por tienda: `eq('store_id', storeId)`
- Por componente: `eq('component_name', name)`
- Por estado: `eq('is_active', true)`

---

## Resumen de Relaciones

```
stores (1) ──→ (N) item_categories
stores (1) ──→ (N) store_items
stores (1) ──→ (N) app_themes
stores (1) ──→ (N) component_styles

item_categories (1) ──→ (N) store_items

store_items (1) ──→ (N) item_variants
store_items (1) ──→ (N) item_images
store_items (1) ──→ (N) item_options
store_items (1) ──→ (N) order_items

orders (1) ──→ (N) order_items

auth.users (1) ──→ (1) user_profiles
user_profiles (1) ──→ (N) orders
```

---

## Estadísticas y Reportes

Las siguientes tablas se consultan para generar estadísticas:

1. **orders**: Para ventas por día, total de pedidos, pedidos por estado
2. **order_items**: Para productos más vendidos, cantidad vendida, ingresos
3. **store_items**: Para total de productos activos
4. **user_profiles**: Para total de usuarios registrados

### Consultas de Estadísticas:
- **Ventas por día**: Agrupa `orders` por fecha (`created_at`), suma `total_amount`
- **Pedidos por estado**: Agrupa `orders` por `status`, cuenta registros
- **Productos más vendidos**: Agrupa `order_items` por `product_id`, suma `quantity` y calcula `revenue = unit_price * quantity`
- **Total de pedidos**: Cuenta registros en `orders`
- **Valor promedio del pedido**: `SUM(total_amount) / COUNT(*)` de `orders`
- **Tasa de conversión**: `COUNT(paid orders) / COUNT(total orders) * 100`

---

## Notas Importantes

1. **Multi-tenancy**: Todas las consultas de productos, categorías, temas, etc. se filtran por `store_id` para soportar múltiples tiendas.

2. **Filtros por defecto**: 
   - Productos: Solo `is_active = true` y `is_available_for_sale = true`
   - Pedidos para estadísticas: Solo con estado `confirmed, processing, shipped, delivered` y `payment_status = paid`

3. **Soft deletes**: La tabla `stores` usa `deleted_at` para soft deletes.

4. **Campos JSONB**: Varias tablas usan JSONB para metadatos flexibles:
   - `orders.metadata`
   - `store_items.metadata`
   - `item_options.option_values`
   - `app_themes.theme_config`
   - `component_styles.style_config`

5. **Timeout en consultas**: Todas las consultas tienen timeouts (10-15 segundos) para evitar bloqueos.

