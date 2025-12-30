# 🍰 Resumen: Crear Tienda de Repostería

## ✅ Lo que ya está hecho

1. ✅ **StoreProvider integrado** en `app/layout.tsx`
2. ✅ **Helper creado** en `lib/utils/store.ts`
3. ✅ **APIs modificadas** para filtrar por `store_id`:
   - `getItems()` - Filtra productos por tienda
   - `getItemBySlug()` - Filtra por tienda
   - `getItemById()` - Filtra por tienda
   - `getCategories()` - Filtra categorías por tienda
4. ✅ **Script SQL creado** para la tienda de repostería: `scripts/34-create-reposteria-store.sql`
5. ✅ **Guía completa** creada: `GUIA-CREAR-TIENDA-REPOSTERIA.md`

## 🚀 Pasos para Activar la Tienda de Repostería

### 1. Ejecutar Scripts SQL en Supabase (5 minutos)

**IMPORTANTE:** Si ya ejecutaste los scripts 30-33 antes, solo necesitas ejecutar el script 34.

#### Si NO has ejecutado los scripts base:

1. Ve a [Supabase Dashboard](https://app.supabase.com/) → SQL Editor
2. Ejecuta en orden:
   - `scripts/30-create-stores-table.sql`
   - `scripts/31-add-store-id-to-products.sql`
   - `scripts/32-add-store-id-to-orders.sql`
   - `scripts/33-add-store-id-to-styles.sql`

#### Crear la tienda de repostería:

3. Ejecuta: `scripts/34-create-reposteria-store.sql`

Este script crea:
- ✅ Tienda con subdominio `reposteria`
- ✅ 6 categorías (Pasteles, Cupcakes, Galletas, Postres, Tartas, Brownies)
- ✅ Colores personalizados (rosa pastel)
- ✅ Configuración básica

### 2. Verificar que se Creó (1 minuto)

Ejecuta en Supabase SQL Editor:

```sql
SELECT id, subdomain, store_name, is_active 
FROM public.stores 
WHERE subdomain = 'reposteria';
```

Deberías ver la tienda de repostería.

### 3. Agregar Productos (Opcional)

Puedes agregar productos de ejemplo:

```sql
-- Obtener IDs necesarios
WITH store_info AS (
  SELECT id as store_id 
  FROM public.stores 
  WHERE subdomain = 'reposteria'
),
category_info AS (
  SELECT id as category_id 
  FROM public.item_categories 
  WHERE store_id = (SELECT id FROM public.stores WHERE subdomain = 'reposteria')
  AND category_name = 'Pasteles'
  LIMIT 1
)
-- Insertar producto
INSERT INTO public.store_items (
  store_id,
  item_name,
  item_description,
  base_price,
  currency_code,
  is_active,
  is_available_for_sale,
  item_slug,
  category_id,
  is_featured
)
SELECT 
  store_id,
  'Pastel de Chocolate',
  'Delicioso pastel de chocolate con crema batida y decoración artesanal',
  45000,
  'COP',
  TRUE,
  TRUE,
  'pastel-chocolate',
  category_id,
  TRUE
FROM store_info, category_info;
```

### 4. Configurar DNS (Producción)

#### En Vercel:

1. Ve a tu proyecto → **Settings** → **Domains**
2. Agrega: `*.tudominio.com` (wildcard - recomendado)
   - O específico: `reposteria.tudominio.com`

#### En tu proveedor DNS:

Si usas wildcard, no necesitas configurar nada más.
Si usas subdominio específico:
- Tipo: `CNAME`
- Nombre: `reposteria`
- Valor: `cname.vercel-dns.com` (o el que te indique Vercel)

### 5. Probar

#### En Desarrollo Local:

Modifica `/etc/hosts` (Linux/Mac) o `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 reposteria.localhost
```

Luego accede a: `http://reposteria.localhost:3000`

#### En Producción:

Una vez configurado DNS (puede tardar 24-48 horas):
```
https://reposteria.tudominio.com
```

## 📋 Checklist Rápido

- [ ] Ejecutar scripts SQL 30-33 (si no lo has hecho)
- [ ] Ejecutar script SQL 34 (crear tienda repostería)
- [ ] Verificar que la tienda existe en Supabase
- [ ] Agregar productos de prueba (opcional)
- [ ] Configurar DNS en Vercel
- [ ] Probar en desarrollo local
- [ ] Probar en producción

## 🎯 Resultado Esperado

Una vez completado, tendrás:

- ✅ **Subdominio funcionando:** `reposteria.tudominio.com`
- ✅ **Tienda creada** con categorías de repostería
- ✅ **Productos filtrados** automáticamente por tienda
- ✅ **Colores personalizados** (rosa pastel)
- ✅ **Lista para agregar productos** y personalizar

## 📚 Documentación

- **Guía completa:** `GUIA-CREAR-TIENDA-REPOSTERIA.md`
- **Estado general:** `ESTADO-SUBDOMINIOS.md`
- **Ejemplos de APIs:** `EJEMPLO-MODIFICAR-APIS.md`

## 🐛 Si algo no funciona

1. **Verifica los logs del middleware** en la consola
2. **Verifica que las tablas existen** en Supabase
3. **Verifica que el store_id está en los headers** (DevTools → Network)
4. **Revisa la guía completa** para troubleshooting

---

**Tiempo estimado total:** ~10-15 minutos (sin contar propagación DNS)

