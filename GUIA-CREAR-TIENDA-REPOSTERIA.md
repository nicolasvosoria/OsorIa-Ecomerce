# 🍰 Guía: Crear Tienda de Repostería con Subdominio

Esta guía te explica paso a paso cómo crear una segunda tienda de repostería con su propio subdominio.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:
- ✅ Acceso a Supabase (base de datos)
- ✅ Acceso a Vercel o tu proveedor de hosting
- ✅ Control de DNS de tu dominio

## 🚀 Pasos para Crear la Tienda de Repostería

### Paso 1: Ejecutar Scripts SQL en Supabase (Si no lo has hecho)

**IMPORTANTE:** Si ya ejecutaste estos scripts antes, puedes saltar al Paso 2.

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com/)
2. Navega a **SQL Editor**
3. Ejecuta los siguientes scripts **EN ORDEN**:

```sql
-- Script 1: Crear tabla de tiendas
-- Copia y pega el contenido de: scripts/30-create-stores-table.sql

-- Script 2: Agregar store_id a productos
-- Copia y pega el contenido de: scripts/31-add-store-id-to-products.sql

-- Script 3: Agregar store_id a pedidos
-- Copia y pega el contenido de: scripts/32-add-store-id-to-orders.sql

-- Script 4: Agregar store_id a estilos
-- Copia y pega el contenido de: scripts/33-add-store-id-to-styles.sql
```

### Paso 2: Crear la Tienda de Repostería

1. En Supabase SQL Editor, ejecuta el script:
   - **`scripts/34-create-reposteria-store.sql`**

Este script:
- ✅ Crea la tienda con subdominio `reposteria`
- ✅ Configura colores y metadatos
- ✅ Crea categorías específicas de repostería (Pasteles, Cupcakes, Galletas, etc.)

### Paso 3: Verificar que se Creó Correctamente

Ejecuta esta consulta en Supabase para verificar:

```sql
SELECT 
  id,
  subdomain,
  store_name,
  is_active,
  primary_color,
  secondary_color
FROM public.stores
WHERE subdomain = 'reposteria';
```

Deberías ver la tienda de repostería con sus datos.

### Paso 4: Agregar Productos a la Tienda de Repostería

Para agregar productos específicos de repostería:

```sql
-- Ejemplo: Agregar un pastel de chocolate
INSERT INTO public.store_items (
  store_id,
  item_name,
  item_description,
  base_price,
  currency_code,
  is_active,
  is_available_for_sale,
  item_slug,
  category_id
) VALUES (
  (SELECT id FROM public.stores WHERE subdomain = 'reposteria'),
  'Pastel de Chocolate',
  'Delicioso pastel de chocolate con crema batida',
  45000,
  'COP',
  TRUE,
  TRUE,
  'pastel-chocolate',
  (SELECT id FROM public.item_categories 
   WHERE store_id = (SELECT id FROM public.stores WHERE subdomain = 'reposteria')
   AND category_name = 'Pasteles' LIMIT 1)
);
```

### Paso 5: Configurar DNS (Producción)

#### Opción A: Wildcard Domain (Recomendado)

En Vercel:
1. Ve a tu proyecto → **Settings** → **Domains**
2. Agrega: `*.tudominio.com`
3. Esto captura automáticamente todos los subdominios

#### Opción B: Subdominio Específico

1. Ve a tu proyecto → **Settings** → **Domains**
2. Agrega: `reposteria.tudominio.com`
3. Configura el DNS en tu proveedor:
   - Tipo: `CNAME`
   - Nombre: `reposteria`
   - Valor: `cname.vercel-dns.com` (o el que te indique Vercel)

### Paso 6: Probar la Tienda

#### En Desarrollo Local

Para probar en desarrollo local, puedes:

1. **Opción 1: Modificar hosts file** (Linux/Mac)
   ```bash
   sudo nano /etc/hosts
   ```
   Agrega:
   ```
   127.0.0.1 reposteria.localhost
   ```
   Luego accede a: `http://reposteria.localhost:3000`

2. **Opción 2: Usar query params** (temporal)
   - El middleware actualmente permite `localhost` sin subdominio
   - Los productos se filtrarán por la tienda 'default' hasta que configures DNS

#### En Producción

Una vez configurado el DNS, accede a:
```
https://reposteria.tudominio.com
```

## 🎨 Personalizar la Tienda de Repostería

### Cambiar Colores

```sql
UPDATE public.stores
SET 
  primary_color = '#TU_COLOR_PRIMARIO',
  secondary_color = '#TU_COLOR_SECUNDARIO'
WHERE subdomain = 'reposteria';
```

### Agregar Logo

```sql
UPDATE public.stores
SET logo_url = 'https://tu-url-del-logo.com/logo.png'
WHERE subdomain = 'reposteria';
```

### Modificar Información de Contacto

```sql
UPDATE public.stores
SET 
  contact_email = 'nuevo-email@tudominio.com',
  contact_phone = '+57 300 123 4567',
  address = 'Tu dirección aquí'
WHERE subdomain = 'reposteria';
```

## 📦 Estructura de Categorías Creadas

La tienda de repostería viene con estas categorías pre-configuradas:

1. **Pasteles** - Pasteles de todos los sabores
2. **Cupcakes** - Cupcakes decorados
3. **Galletas** - Galletas artesanales
4. **Postres** - Postres individuales
5. **Tartas** - Tartas dulces y saladas
6. **Brownies** - Brownies y barras

Puedes agregar más categorías si lo necesitas.

## 🔍 Verificar que Funciona

### 1. Verificar Middleware

El middleware debería:
- ✅ Detectar el subdominio `reposteria`
- ✅ Buscar la tienda en Supabase
- ✅ Establecer headers `x-store-id` y `x-store-subdomain`
- ✅ Establecer cookie `store_id`

### 2. Verificar Store Context

En la consola del navegador, deberías poder ver:
```javascript
// En cualquier componente cliente
import { useStore } from '@/contexts/store-context'

const { store, storeId } = useStore()
console.log(store) // Debería mostrar la tienda de repostería
```

### 3. Verificar Filtrado de Productos

Los productos deberían filtrarse automáticamente:
- ✅ Solo productos con `store_id` de repostería
- ✅ Solo categorías de repostería
- ✅ No deberían aparecer productos de otras tiendas

## 🐛 Solución de Problemas

### La tienda no se encuentra

**Problema:** Al acceder a `reposteria.tudominio.com` aparece "Tienda no encontrada"

**Solución:**
1. Verifica que ejecutaste el script `34-create-reposteria-store.sql`
2. Verifica que el subdominio es exactamente `reposteria` (sin espacios)
3. Verifica que `is_active = TRUE` en la base de datos

### Los productos no aparecen

**Problema:** No se muestran productos en la tienda de repostería

**Solución:**
1. Verifica que los productos tienen `store_id` asignado
2. Verifica que el `store_id` coincide con el de la tienda de repostería
3. Verifica que `is_active = TRUE` y `is_available_for_sale = TRUE`

### El DNS no funciona

**Problema:** No puedo acceder al subdominio

**Solución:**
1. Espera 24-48 horas para que el DNS se propague
2. Verifica la configuración DNS en tu proveedor
3. Usa herramientas como `dig` o `nslookup` para verificar

## 📝 Próximos Pasos

1. **Agregar productos** a la tienda de repostería
2. **Personalizar estilos** específicos para repostería
3. **Configurar temas** y fuentes personalizadas
4. **Agregar imágenes** de productos
5. **Configurar métodos de pago** específicos si es necesario

## 🎯 Resumen

✅ **Tienda creada:** `reposteria.tudominio.com`
✅ **Categorías:** 6 categorías de repostería
✅ **Colores:** Rosa pastel (#FF6B9D) y rosa claro (#FFE5F1)
✅ **Lista para:** Agregar productos y personalizar

---

¿Necesitas ayuda? Revisa los logs del middleware y la consola del navegador para más detalles.

