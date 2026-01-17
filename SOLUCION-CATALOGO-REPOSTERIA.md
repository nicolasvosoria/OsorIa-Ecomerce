# 🔧 Solución: Productos No Se Cargan en Catálogo de Repostería

## ❌ Problema

Los productos no se están cargando en la página de catálogo cuando se accede desde el subdominio de repostería (`reposteria.localhost:3000/catalog`).

## 🔍 Diagnóstico

El problema puede deberse a:

1. **Store ID no se obtiene correctamente**: El `store_id` puede ser `null` o estar obteniendo la tienda incorrecta
2. **Productos no están asociados a la tienda**: Los productos pueden no tener el `store_id` de repostería
3. **Categorías no están asociadas a la tienda**: Las categorías pueden no tener el `store_id` de repostería

## ✅ Solución Implementada

### 1. Mejora en la Obtención de Store ID

La página ahora obtiene el `store_id` de múltiples fuentes:

1. **Headers HTTP** (establecido por middleware): `x-store-id`
2. **Cookies**: `store_id`
3. **Subdominio**: Si no hay header/cookie, consulta Supabase por subdominio

### 2. Logs de Debugging

Se agregaron logs para ayudar a diagnosticar:

```typescript
console.log('[Catalog] Store ID obtenido:', storeId)
console.log('[Catalog] Categorías obtenidas:', categories.length)
console.log(`[Catalog] Productos obtenidos para "${categoryName}":`, result.items.length)
```

## 🔍 Verificación en Supabase

### Paso 1: Verificar que la Tienda Existe

Ejecuta en Supabase SQL Editor:

```sql
SELECT id, subdomain, store_name, is_active
FROM stores
WHERE subdomain = 'reposteria';
```

**Debe retornar**:
- `id`: UUID de la tienda
- `subdomain`: `'reposteria'`
- `is_active`: `true`

### Paso 2: Verificar que las Categorías Están Asociadas

```sql
SELECT 
  ic.id,
  ic.category_name,
  ic.store_id,
  s.store_name,
  s.subdomain
FROM item_categories ic
LEFT JOIN stores s ON ic.store_id = s.id
WHERE s.subdomain = 'reposteria'
  AND ic.is_active = true
ORDER BY ic.display_order;
```

**Debe retornar** las categorías de repostería (Pasteles, Cupcakes, Galletas, etc.)

### Paso 3: Verificar que los Productos Están Asociados

```sql
SELECT 
  si.id,
  si.item_name,
  si.store_id,
  s.store_name,
  s.subdomain,
  ic.category_name
FROM store_items si
LEFT JOIN stores s ON si.store_id = s.id
LEFT JOIN item_categories ic ON si.category_id = ic.id
WHERE s.subdomain = 'reposteria'
  AND si.is_active = true
  AND si.is_available_for_sale = true
ORDER BY ic.display_order, si.display_order;
```

**Debe retornar** los productos de repostería

## 🛠️ Si No Hay Productos

### Opción 1: Crear Productos de Ejemplo para Repostería

Ejecuta este SQL en Supabase (ajusta los valores según necesites):

```sql
-- Obtener el ID de la tienda de repostería
DO $$
DECLARE
  reposteria_store_id UUID;
  pasteles_category_id UUID;
  cupcakes_category_id UUID;
BEGIN
  -- Obtener ID de la tienda
  SELECT id INTO reposteria_store_id
  FROM stores
  WHERE subdomain = 'reposteria'
  LIMIT 1;
  
  IF reposteria_store_id IS NULL THEN
    RAISE EXCEPTION 'Tienda de repostería no encontrada. Ejecuta primero el script 34-create-reposteria-store.sql';
  END IF;
  
  -- Obtener IDs de categorías
  SELECT id INTO pasteles_category_id
  FROM item_categories
  WHERE store_id = reposteria_store_id
    AND category_name = 'Pasteles'
  LIMIT 1;
  
  SELECT id INTO cupcakes_category_id
  FROM item_categories
  WHERE store_id = reposteria_store_id
    AND category_name = 'Cupcakes'
  LIMIT 1;
  
  -- Insertar productos de ejemplo
  IF pasteles_category_id IS NOT NULL THEN
    INSERT INTO store_items (
      store_id,
      category_id,
      item_name,
      item_description,
      base_price,
      currency_code,
      is_active,
      is_available_for_sale,
      display_order
    ) VALUES
      (reposteria_store_id, pasteles_category_id, 'Pastel de Chocolate', 'Delicioso pastel de chocolate artesanal', 45000, 'COP', TRUE, TRUE, 1),
      (reposteria_store_id, pasteles_category_id, 'Pastel de Vainilla', 'Pastel de vainilla con crema', 42000, 'COP', TRUE, TRUE, 2),
      (reposteria_store_id, pasteles_category_id, 'Pastel de Fresa', 'Pastel de fresa fresca', 48000, 'COP', TRUE, TRUE, 3)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF cupcakes_category_id IS NOT NULL THEN
    INSERT INTO store_items (
      store_id,
      category_id,
      item_name,
      item_description,
      base_price,
      currency_code,
      is_active,
      is_available_for_sale,
      display_order
    ) VALUES
      (reposteria_store_id, cupcakes_category_id, 'Cupcake de Chocolate', 'Cupcake de chocolate con frosting', 8000, 'COP', TRUE, TRUE, 1),
      (reposteria_store_id, cupcakes_category_id, 'Cupcake de Vainilla', 'Cupcake de vainilla decorado', 7500, 'COP', TRUE, TRUE, 2),
      (reposteria_store_id, cupcakes_category_id, 'Cupcake de Red Velvet', 'Cupcake de red velvet premium', 9500, 'COP', TRUE, TRUE, 3)
    ON CONFLICT DO NOTHING;
  END IF;
  
  RAISE NOTICE 'Productos de ejemplo creados para la tienda de repostería';
END $$;
```

### Opción 2: Asignar Productos Existentes a Repostería

Si ya tienes productos pero están en otra tienda:

```sql
-- Obtener ID de la tienda de repostería
DO $$
DECLARE
  reposteria_store_id UUID;
  default_store_id UUID;
BEGIN
  SELECT id INTO reposteria_store_id
  FROM stores
  WHERE subdomain = 'reposteria'
  LIMIT 1;
  
  SELECT id INTO default_store_id
  FROM stores
  WHERE subdomain = 'default'
  LIMIT 1;
  
  IF reposteria_store_id IS NOT NULL AND default_store_id IS NOT NULL THEN
    -- Asignar productos de la tienda por defecto a repostería
    UPDATE store_items
    SET store_id = reposteria_store_id
    WHERE store_id = default_store_id
      AND is_active = true;
    
    RAISE NOTICE 'Productos asignados a la tienda de repostería';
  END IF;
END $$;
```

## 🔍 Verificación en el Navegador

1. **Abre Developer Tools** (F12)
2. **Ve a Console** y busca logs que empiecen con `[Catalog]`:
   - `[Catalog] Store ID obtenido: <uuid>`
   - `[Catalog] Categorías obtenidas: <número>`
   - `[Catalog] Productos obtenidos para "<categoría>": <número>`

3. **Si ves "Store ID obtenido: null"**:
   - Verifica que el middleware está estableciendo el header `x-store-id`
   - Verifica que la cookie `store_id` está siendo establecida

4. **Si ves "Categorías obtenidas: 0"**:
   - Verifica que las categorías tienen `store_id` de repostería
   - Ejecuta el script `34-create-reposteria-store.sql` si no lo has ejecutado

5. **Si ves "Productos obtenidos: 0"**:
   - Verifica que los productos tienen `store_id` de repostería
   - Verifica que los productos tienen `category_id` asociado
   - Crea productos usando el SQL de arriba

## 📝 Checklist de Verificación

- [ ] La tienda de repostería existe en Supabase con `subdomain = 'reposteria'`
- [ ] Las categorías tienen `store_id` de la tienda de repostería
- [ ] Los productos tienen `store_id` de la tienda de repostería
- [ ] Los productos tienen `category_id` asociado a una categoría
- [ ] Los productos tienen `is_active = TRUE`
- [ ] Los productos tienen `is_available_for_sale = TRUE`
- [ ] El middleware está estableciendo el header `x-store-id`
- [ ] La cookie `store_id` está siendo establecida

## 🎯 Resultado Esperado

Después de verificar todo lo anterior, deberías ver:

1. **En la consola del servidor**:
   ```
   [Catalog] Store ID obtenido: <uuid-de-reposteria>
   [Catalog] Categorías obtenidas: 6
   [Catalog] Productos obtenidos para "Pasteles": 3
   [Catalog] Productos obtenidos para "Cupcakes": 3
   ```

2. **En la página**:
   - Todas las categorías de repostería listadas
   - Productos mostrados en cada categoría
   - Grid responsive con imágenes y precios

## 🆘 Si Aún No Funciona

1. **Revisa los logs del servidor** (donde ejecutaste `npm run dev`)
2. **Revisa la consola del navegador** (F12 → Console)
3. **Verifica en Supabase** que los datos existen y están correctamente asociados
4. **Asegúrate de que el middleware está funcionando** (verifica headers en Network tab)
