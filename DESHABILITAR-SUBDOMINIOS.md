# Deshabilitar Funcionalidad de Subdominios (Multi-tenant)

Este documento explica cómo deshabilitar temporalmente la funcionalidad de subdominios/multi-tenant sin eliminar código del proyecto. Esto es útil para desplegar en Vercel cuando hay problemas con la detección de subdominios.

## 🎯 Propósito

Deshabilitar temporalmente la lógica de subdominios permite que la aplicación funcione con una sola tienda por defecto, evitando consultas a la base de datos para detectar subdominios y simplificando el despliegue.

## ⚙️ Configuración

### Variables de Entorno

Agrega las siguientes variables de entorno en tu archivo `.env.local` (desarrollo) o en el panel de Vercel (producción):

```bash
# Deshabilitar funcionalidad de subdominios
DISABLE_SUBDOMAIN_MULTI_TENANT=true

# (Opcional) Store ID por defecto a usar cuando multi-tenant está deshabilitado
# Si no se especifica, se usará 'default'
DEFAULT_STORE_ID=tu-uuid-de-tienda-por-defecto
```

**Para Vercel:**

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Agrega:
   - `DISABLE_SUBDOMAIN_MULTI_TENANT` = `true`
   - `DEFAULT_STORE_ID` = (opcional, UUID de tu tienda por defecto)

### Variables Públicas (Cliente)

Si necesitas que el cliente también sepa que multi-tenant está deshabilitado, agrega:

```bash
NEXT_PUBLIC_DISABLE_SUBDOMAIN_MULTI_TENANT=true
NEXT_PUBLIC_DEFAULT_STORE_ID=tu-uuid-de-tienda-por-defecto
```

## 🔧 Cómo Funciona

Cuando `DISABLE_SUBDOMAIN_MULTI_TENANT=true`:

1. **Middleware (`middleware.ts`):**
   - No consulta la base de datos para obtener información de tienda por subdominio
   - Usa directamente el `DEFAULT_STORE_ID` o `'default'` si no está especificado
   - Establece headers y cookies con el store_id por defecto

2. **Funciones de Store ID:**
   - `getStoreId()` - Retorna el store_id por defecto sin consultar headers/cookies
   - `getStoreIdSync()` - Retorna el store_id por defecto (cliente)
   - `getStoreIdServer()` - Retorna el store_id por defecto (servidor)
   - `getStoreIdFromServer()` - Retorna el store_id por defecto (store-api.ts)

3. **Consultas a Base de Datos:**
   - Las consultas seguirán filtrando por `store_id`, pero ahora siempre usarán el mismo store_id por defecto
   - No se realizan consultas para detectar subdominios

## 📝 Ejemplo de Uso

### Desarrollo Local

Crea o edita `.env.local`:

```bash
DISABLE_SUBDOMAIN_MULTI_TENANT=true
DEFAULT_STORE_ID=123e4567-e89b-12d3-a456-426614174000
```

### Producción en Vercel

1. Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
2. Agrega:
   ```
   DISABLE_SUBDOMAIN_MULTI_TENANT = true
   DEFAULT_STORE_ID = 123e4567-e89b-12d3-a456-426614174000
   ```
3. Redespliega la aplicación

## ⚠️ Consideraciones

1. **Store ID por Defecto:**
   - Si no especificas `DEFAULT_STORE_ID`, se usará el string `'default'`
   - Asegúrate de que tu base de datos tenga una tienda con `subdomain = 'default'` o con el UUID que especifiques
   - Si usas un UUID, debe existir en la tabla `stores`

2. **Reactivar Multi-tenant:**
   - Simplemente elimina o establece `DISABLE_SUBDOMAIN_MULTI_TENANT=false`
   - No necesitas modificar código, solo cambiar la variable de entorno

3. **Consultas a Base de Datos:**
   - Las consultas seguirán filtrando por `store_id`
   - Asegúrate de que todos los datos (productos, categorías, temas, etc.) tengan el `store_id` correcto

## 🔄 Reactivar Multi-tenant

Para reactivar la funcionalidad de subdominios:

1. Elimina o establece `DISABLE_SUBDOMAIN_MULTI_TENANT=false` en las variables de entorno
2. Redespliega la aplicación
3. La funcionalidad de subdominios volverá a funcionar normalmente

## 📋 Checklist para Despliegue

- [ ] Agregar `DISABLE_SUBDOMAIN_MULTI_TENANT=true` en Vercel
- [ ] (Opcional) Agregar `DEFAULT_STORE_ID` con el UUID de tu tienda por defecto
- [ ] Verificar que existe una tienda con `subdomain = 'default'` o con el UUID especificado
- [ ] Verificar que todos los datos tienen el `store_id` correcto
- [ ] Redesplegar la aplicación
- [ ] Probar que la aplicación funciona correctamente

## 🐛 Solución de Problemas

### La aplicación no carga

- Verifica que `DISABLE_SUBDOMAIN_MULTI_TENANT=true` está configurado correctamente
- Verifica que existe una tienda con el `store_id` especificado en `DEFAULT_STORE_ID`
- Revisa los logs de Vercel para ver errores

### Los productos no aparecen

- Verifica que los productos tienen el `store_id` correcto en la base de datos
- Si usas `DEFAULT_STORE_ID`, asegúrate de que coincide con el `store_id` de tus productos

### Error al obtener tienda

- Si ves errores relacionados con "tienda no encontrada", verifica que:
  - Existe una tienda con `subdomain = 'default'` (si no especificas `DEFAULT_STORE_ID`)
  - O existe una tienda con el UUID especificado en `DEFAULT_STORE_ID`


