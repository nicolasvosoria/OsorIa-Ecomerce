# 🚀 Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar el proyecto Osoria E-commerce en Vercel con soporte para múltiples subdominios.

## 📋 Requisitos Previos

- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [Supabase](https://supabase.com)
- Repositorio en GitHub (recomendado)
- Dominio personalizado (opcional, para subdominios)

## 🔧 Paso 1: Preparar el Proyecto

### 1.1 Verificar Configuración de Next.js

El archivo `next.config.mjs` ya está configurado correctamente. No necesitas cambios adicionales.

### 1.2 Verificar que el Build Funciona

Antes de desplegar, verifica que el build funciona localmente:

```bash
pnpm build
```

Si hay errores, corrígelos antes de continuar.

## 🌐 Paso 2: Configurar Variables de Entorno en Vercel

### 2.1 Variables Obligatorias

Ve a tu proyecto en Vercel → Settings → Environment Variables y agrega:

```env
# Supabase - OBLIGATORIAS
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 2.2 Variables Opcionales

```env
# Shopify (si usas Shopify)
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com

# URL del sitio (Vercel lo detecta automáticamente, pero puedes especificarlo)
NEXT_PUBLIC_SITE_URL=https://tu-dominio.vercel.app
```

### 2.3 Configurar para Todos los Entornos

Asegúrate de que las variables estén configuradas para:
- ✅ Production
- ✅ Preview
- ✅ Development

## 🔗 Paso 3: Configurar Dominios y Subdominios

### 3.1 Dominio Principal

1. Ve a tu proyecto en Vercel → Settings → Domains
2. Agrega tu dominio principal (ej: `tudominio.com`)
3. Sigue las instrucciones de Vercel para configurar los DNS

### 3.2 Subdominios (Para Multi-tenancy)

Para que funcionen los subdominios como `reposteria.tudominio.com`:

#### Opción A: Usar Wildcard Domain (Recomendado)

1. En Vercel → Settings → Domains
2. Agrega un dominio wildcard: `*.tudominio.com`
3. Esto permitirá que cualquier subdominio funcione automáticamente

#### Opción B: Agregar Subdominios Individualmente

Si prefieres control específico, agrega cada subdominio:
- `reposteria.tudominio.com`
- `default.tudominio.com`
- etc.

### 3.3 Configurar DNS

En tu proveedor de DNS, agrega:

```
Tipo: CNAME
Nombre: * (o el subdominio específico)
Valor: cname.vercel-dns.com
```

O si usas A record:
```
Tipo: A
Nombre: @
Valor: 76.76.21.21
```

Consulta la documentación de Vercel para la configuración exacta según tu proveedor.

## 🗄️ Paso 4: Configurar Supabase para Producción

### 4.1 URLs de Redirección

1. Ve a Supabase Dashboard → Authentication → URL Configuration
2. Agrega a **Site URL**: `https://tu-dominio.vercel.app`
3. Agrega a **Redirect URLs**:
   ```
   https://tu-dominio.vercel.app/auth/callback
   https://tu-dominio.vercel.app/auth/reset-password
   https://reposteria.tu-dominio.vercel.app/auth/callback
   https://reposteria.tu-dominio.vercel.app/auth/reset-password
   ```

### 4.2 Configurar RLS (Row Level Security)

Asegúrate de que las políticas RLS estén configuradas correctamente para producción. Revisa que:
- Las tablas públicas tengan políticas de lectura apropiadas
- Las tablas de usuarios tengan políticas de escritura correctas

### 4.3 Verificar Funciones RPC

Asegúrate de que la función `get_store_by_subdomain` esté creada en Supabase:

```sql
-- Verificar que existe
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_store_by_subdomain';
```

Si no existe, ejecuta el script `scripts/30-create-stores-table.sql` que la crea.

## 📝 Paso 5: Configuración Adicional

### 5.1 Verificar Middleware

El middleware ya está configurado para detectar subdominios tanto en desarrollo como en producción. No necesitas cambios.

### 5.2 Configurar Build Command (si es necesario)

Por defecto, Vercel detecta automáticamente Next.js. Si necesitas personalizar:

En Vercel → Settings → General → Build & Development Settings:
- **Build Command**: `pnpm build` (o `npm run build`)
- **Output Directory**: `.next` (automático)
- **Install Command**: `pnpm install` (o `npm install`)

### 5.3 Node.js Version

Asegúrate de que Vercel use Node.js 20:

1. Ve a Settings → General
2. En "Node.js Version", selecciona `20.x`

O crea un archivo `.nvmrc` en la raíz del proyecto:
```
20
```

## 🚀 Paso 6: Desplegar

### 6.1 Despliegue Automático desde GitHub

1. Conecta tu repositorio de GitHub a Vercel
2. Vercel detectará automáticamente Next.js
3. El despliegue se iniciará automáticamente en cada push a `main` o `master`

### 6.2 Despliegue Manual

Si prefieres desplegar manualmente:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Desplegar
vercel --prod
```

## ✅ Paso 7: Verificar el Despliegue

### 7.1 Verificar Dominio Principal

1. Accede a `https://tu-dominio.vercel.app`
2. Verifica que la tienda por defecto se muestre correctamente
3. Verifica que la autenticación funcione

### 7.2 Verificar Subdominios

1. Accede a `https://reposteria.tu-dominio.vercel.app`
2. Verifica que:
   - Se detecte el subdominio correctamente
   - Se muestre el diseño de repostería
   - Los colores y fuentes personalizadas se apliquen
   - Los productos se filtren por tienda

### 7.3 Verificar Funcionalidades

- ✅ Autenticación (login, registro, recuperación de contraseña)
- ✅ Carrito de compras
- ✅ Productos y categorías
- ✅ Checkout (invitado y con cuenta)
- ✅ Panel de administración
- ✅ Dashboard de administrador

## 🔍 Paso 8: Solución de Problemas

### Problema: Subdominios no funcionan

**Solución:**
1. Verifica que el dominio wildcard esté configurado en Vercel
2. Verifica que los DNS estén configurados correctamente
3. Espera a que los DNS se propaguen (puede tardar hasta 48 horas)
4. Verifica en el middleware que se detecte correctamente el subdominio

### Problema: Error de autenticación

**Solución:**
1. Verifica que las URLs de redirección estén configuradas en Supabase
2. Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctas
3. Verifica que las políticas RLS permitan las operaciones necesarias

### Problema: No se encuentran productos

**Solución:**
1. Verifica que la tienda esté creada en Supabase con el subdominio correcto
2. Verifica que los productos tengan el `store_id` correcto
3. Verifica que la función `get_store_by_subdomain` funcione correctamente

### Problema: Estilos no se aplican en repostería

**Solución:**
1. Verifica que la tienda de repostería tenga `primary_color` y `secondary_color` configurados
2. Verifica que el `ReposteriaLayout` se esté ejecutando correctamente
3. Revisa la consola del navegador para errores de JavaScript

## 📊 Paso 9: Monitoreo y Optimización

### 9.1 Analytics de Vercel

Vercel proporciona analytics automáticos. Actívalos en:
Settings → Analytics → Enable Vercel Analytics

### 9.2 Logs

Revisa los logs en Vercel Dashboard → Deployments → [Tu deployment] → Functions

### 9.3 Performance

- Vercel optimiza automáticamente las imágenes con Next.js Image
- El middleware se ejecuta en el Edge Network para mejor rendimiento
- Las páginas estáticas se generan automáticamente cuando es posible

## 🔐 Paso 10: Seguridad

### 10.1 Variables de Entorno

- ✅ Nunca expongas `NEXT_PUBLIC_SUPABASE_ANON_KEY` en el código
- ✅ Usa variables de entorno de Vercel para todos los secretos
- ✅ No uses `NEXT_PUBLIC_` para variables sensibles del servidor

### 10.2 Headers de Seguridad

Vercel añade automáticamente headers de seguridad. Puedes personalizarlos en `next.config.mjs` si es necesario.

### 10.3 CORS

Si necesitas configurar CORS, hazlo en el middleware o en las API routes.

## 📝 Checklist Final

Antes de considerar el despliegue completo, verifica:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Dominio principal configurado
- [ ] Subdominios configurados (wildcard o individuales)
- [ ] DNS configurados correctamente
- [ ] Supabase URLs de redirección configuradas
- [ ] Tiendas creadas en Supabase (default, reposteria, etc.)
- [ ] Productos asociados a las tiendas correctas
- [ ] Build funciona sin errores
- [ ] Autenticación funciona en producción
- [ ] Subdominios funcionan correctamente
- [ ] Estilos personalizados se aplican correctamente
- [ ] Carrito y checkout funcionan
- [ ] Panel de administración accesible

## 🎯 Próximos Pasos

Una vez desplegado:

1. Configura un dominio personalizado si aún no lo tienes
2. Configura SSL (automático en Vercel)
3. Configura backups de la base de datos en Supabase
4. Configura monitoreo y alertas
5. Optimiza imágenes y assets
6. Configura CDN si es necesario

## 📚 Recursos

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js Deployment](https://nextjs.org/docs/deployment)
- [Documentación de Supabase](https://supabase.com/docs)
- [Configuración de DNS en Vercel](https://vercel.com/docs/concepts/projects/domains)

---

¿Necesitas ayuda? Revisa los logs de Vercel o consulta la documentación oficial.

