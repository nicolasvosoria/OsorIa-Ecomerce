# 🚀 Guía: Despliegue en Vercel sin Subdominios

Esta guía explica cómo desplegar el proyecto en Vercel eliminando temporalmente el soporte para subdominios, dejando solo funcional el ecommerce principal.

## ✅ Cambios Realizados

### 1. Middleware Simplificado
El archivo `middleware.ts` ha sido simplificado para que **siempre use la tienda 'default'** sin verificar subdominios. Esto permite que el sitio funcione con cualquier dominio sin necesidad de configurar subdominios.

**Cambios realizados:**
- ❌ Eliminada la lógica de detección de subdominios
- ❌ Eliminadas las consultas a Supabase para obtener tiendas por subdominio
- ❌ Eliminadas las redirecciones a subdominios
- ✅ Siempre usa `store_id = 'default'`
- ✅ Establece headers y cookies para la tienda principal

### 2. Componentes Compatibles
Los siguientes componentes **continúan funcionando** pero no detectarán subdominios específicos:
- `StoreContext` - Maneja correctamente cuando no hay subdominio (usa 'default')
- `DynamicFavicon` - Usará el favicon por defecto
- `DynamicTitle` - Usará el título por defecto
- Componentes que verifican `store?.subdomain === 'reposteria'` - No detectarán 'reposteria', lo cual está bien para el despliegue temporal

## 📋 Pasos para Desplegar en Vercel

### Paso 1: Preparar el Repositorio

1. **Asegúrate de tener todos los cambios guardados:**
   ```bash
   git add .
   git commit -m "Simplificar middleware para despliegue sin subdominios"
   git push
   ```

### Paso 2: Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel
2. Ve a **Settings** → **Environment Variables**
3. Configura las siguientes variables (si no están ya configuradas):

   #### Variables Requeridas:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
   ```

   #### Variables Opcionales:
   ```
   NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
   NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
   ```

   **Nota:** Configura estas variables para los entornos:
   - ✅ **Production**
   - ✅ **Preview** (opcional pero recomendado)

### Paso 3: Verificar Base de Datos Supabase

Asegúrate de que existe una tienda con `subdomain = 'default'` en tu base de datos:

```sql
-- Verificar que existe la tienda por defecto
SELECT id, subdomain, store_name, is_active 
FROM ecommerce.stores_legacy 
WHERE subdomain = 'default';
```

Si no existe, créala:

```sql
-- Crear tienda por defecto si no existe
INSERT INTO ecommerce.stores_legacy (id, subdomain, store_name, domain, is_active, is_public, currency_code)
VALUES (
  gen_random_uuid(),
  'default',
  'Tienda Principal',
  'tu-dominio.com',
  true,
  true,
  'COP'
)
ON CONFLICT (subdomain) DO NOTHING;
```

### Paso 4: Desplegar en Vercel

#### Opción A: Desde el Dashboard de Vercel
1. Ve a tu proyecto en Vercel
2. Haz clic en **Deployments**
3. Si hay cambios pendientes, Vercel los detectará automáticamente
4. Haz clic en **Deploy** o espera a que se despliegue automáticamente si tienes integración con GitHub

#### Opción B: Desde la Terminal
```bash
# Instalar Vercel CLI (si no está instalado)
npm i -g vercel

# Hacer login en Vercel
vercel login

# Desplegar
vercel --prod
```

### Paso 5: Configurar Dominio (Opcional)

Si quieres usar un dominio personalizado:

1. Ve a **Settings** → **Domains** en Vercel
2. Agrega tu dominio (ej: `tudominio.com`)
3. Sigue las instrucciones para configurar los registros DNS:
   - **Tipo A**: Apunta a `76.76.21.21`
   - **Tipo CNAME**: Apunta a `cname.vercel-dns.com`

**Importante:** NO necesitas configurar subdominios para este despliegue temporal.

### Paso 6: Verificar el Despliegue

1. Visita tu sitio desplegado: `https://tu-proyecto.vercel.app`
2. Verifica que:
   - ✅ La página carga correctamente
   - ✅ Los productos se muestran
   - ✅ El carrito funciona
   - ✅ El checkout funciona
   - ✅ No hay errores en la consola del navegador

### Paso 7: Verificar Logs (si hay problemas)

1. Ve a **Deployments** en Vercel
2. Haz clic en el deployment más reciente
3. Revisa los **Logs** para ver si hay errores
4. Revisa la sección **Functions** para ver logs del middleware

## 🔍 Verificaciones Adicionales

### Verificar que el Middleware Funciona

Abre las herramientas de desarrollador (F12) y verifica:

1. **Headers de respuesta:**
   - Busca `x-store-id: default`
   - Busca `x-store-subdomain: default`
   - Busca la cookie `store_id=default`

2. **Network Tab:**
   - Verifica que las peticiones a `/api/store` funcionan
   - Verifica que no hay redirecciones a subdominios

### Verificar Base de Datos

Asegúrate de que todos los datos están asociados a la tienda 'default':

```sql
-- Verificar productos de la tienda por defecto
SELECT COUNT(*) FROM ecommerce.products 
WHERE store_id = (SELECT id FROM ecommerce.stores_legacy WHERE subdomain = 'default');

-- Verificar órdenes de la tienda por defecto
SELECT COUNT(*) FROM ecommerce.orders 
WHERE store_id = (SELECT id FROM ecommerce.stores_legacy WHERE subdomain = 'default');
```

## ⚠️ Limitaciones Temporales

Durante este despliegue temporal:

- ❌ Los subdominios NO funcionarán (ej: `reposteria.tudominio.com`)
- ❌ No se pueden acceder a tiendas específicas por subdominio
- ✅ Solo la tienda 'default' está disponible
- ✅ El ecommerce principal funciona completamente

## 🔄 Restaurar Soporte de Subdominios

Cuando quieras restaurar el soporte de subdominios:

1. **Restaura el middleware original:**
   ```bash
   git log middleware.ts  # Encuentra el commit anterior
   git checkout <commit-hash> -- middleware.ts
   ```

2. **O manualmente:** Restaura las funciones `getSubdomain()` y `getStoreBySubdomain()` que fueron eliminadas.

3. **Vuelve a desplegar en Vercel**

## 🐛 Solución de Problemas

### Problema: "Store not found"
**Solución:** Verifica que existe una tienda con `subdomain = 'default'` en Supabase.

### Problema: Los productos no se cargan
**Solución:** Verifica que los productos tienen `store_id` que coincide con el ID de la tienda 'default'.

### Problema: Error en el middleware
**Solución:** Revisa los logs en Vercel → Deployments → [Tu deployment] → Functions → middleware

### Problema: Redirecciones infinitas
**Solución:** Asegúrate de que el middleware simplificado está desplegado y no hay versiones en caché.

## 📝 Notas Importantes

1. **Este es un cambio temporal:** El código original está comentado en el middleware para facilitar su restauración.

2. **No afecta datos existentes:** Los datos en la base de datos no se modifican, solo cambia cómo se acceden.

3. **El StoreContext maneja todo correctamente:** El contexto de tienda ya está preparado para trabajar con 'default' cuando no hay subdominio.

4. **Compatible con desarrollo local:** El middleware simplificado también funciona en desarrollo local.

## ✅ Checklist Pre-Despliegue

- [ ] Cambios en `middleware.ts` guardados y commiteados
- [ ] Variables de entorno configuradas en Vercel
- [ ] Tienda 'default' existe en Supabase
- [ ] Productos asociados a la tienda 'default'
- [ ] Pruebas locales realizadas (`pnpm dev`)
- [ ] Build local exitoso (`pnpm build`)
- [ ] Repositorio actualizado en GitHub
- [ ] Listo para desplegar

## 🎯 Siguiente Paso

Una vez completados todos los pasos, el ecommerce principal debería estar funcionando en Vercel sin necesidad de configurar subdominios.

Para cualquier problema, revisa los logs de Vercel o consulta la sección de solución de problemas arriba.
