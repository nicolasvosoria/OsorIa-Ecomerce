# 🚀 Guía de Despliegue en Vercel con Subdominios

Esta guía te ayudará a desplegar tu proyecto de e-commerce multi-tenant en Vercel con soporte para múltiples subdominios.

## 📋 Requisitos Previos

1. **Cuenta de Vercel**: [https://vercel.com](https://vercel.com)
2. **Cuenta de Supabase**: [https://supabase.com](https://supabase.com)
3. **Repositorio en GitHub**: Tu código debe estar en un repositorio de GitHub
4. **Dominio personalizado** (opcional pero recomendado): Para usar subdominios personalizados

## 🔧 Paso 1: Configuración del Proyecto en Vercel

### 1.1. Importar el Proyecto

1. Ve a [Vercel Dashboard](https://vercel.com/dashboard)
2. Haz clic en **"Add New..."** → **"Project"**
3. Importa tu repositorio de GitHub
4. Vercel detectará automáticamente que es un proyecto Next.js

### 1.2. Configuración del Build

Vercel detectará automáticamente:
- **Framework**: Next.js
- **Build Command**: `pnpm build` (o `npm run build`)
- **Output Directory**: `.next` (automático)
- **Install Command**: `pnpm install` (o `npm install`)

No necesitas cambiar nada aquí, a menos que tengas una configuración especial.

## 🔐 Paso 2: Variables de Entorno

### 2.1. Variables Requeridas

En el dashboard de Vercel, ve a **Settings** → **Environment Variables** y agrega:

#### **Supabase (Requeridas)**
```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
```
**Importante:** `SUPABASE_SERVICE_ROLE_KEY` es necesaria para que el asistente virtual pueda leer el catálogo de productos. Sin ella, las preguntas sobre productos darán error o respuestas genéricas. Añádela en **Production** y **Preview**.

#### **Asistente virtual (Chat con IA)**
```
DEEPSEEK_API_KEY=tu-api-key-de-deepseek
```
Sin esta variable, el chat no podrá responder con IA. La ruta `/api/chat` tiene `maxDuration = 30` segundos; en plan Hobby de Vercel el límite es 10s, por lo que respuestas muy largas pueden hacer timeout (en plan Pro el límite es mayor).

#### **SMTP para Emails (Opcional pero recomendado)**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicación
SMTP_FROM="Tu Tienda <tu-email@gmail.com>"
```

**Nota para Gmail:**
1. Activa la verificación en 2 pasos
2. Genera una "Contraseña de aplicación" en [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Usa esa contraseña en `SMTP_PASS`

#### **URL del Sitio (Opcional)**
```
NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
```

Si no la defines, Vercel usará automáticamente `VERCEL_URL`.

#### **Shopify (Opcional)**
```
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
```

### 2.2. Configurar para Entornos

Puedes configurar variables diferentes para:
- **Production**: Producción
- **Preview**: Pull requests y branches
- **Development**: Desarrollo local

Recomendación: Configura todas las variables para **Production** y **Preview**.

## 🌐 Paso 3: Configuración de Dominios y Subdominios

### 3.1. Agregar Dominio Principal

1. En Vercel, ve a **Settings** → **Domains**
2. Agrega tu dominio principal (ej: `tudominio.com`)
3. Sigue las instrucciones para configurar los registros DNS:
   - **Tipo A**: Apunta a `76.76.21.21`
   - **Tipo CNAME**: Apunta a `cname.vercel-dns.com`

### 3.2. Configurar Subdominios

Para cada subdominio (ej: `reposteria.tudominio.com`):

1. En **Settings** → **Domains**, agrega el subdominio completo
2. O configura un **Wildcard Domain**: `*.tudominio.com` (recomendado)
   - Esto permite que cualquier subdominio funcione automáticamente

**Configuración DNS para Wildcard:**
```
Tipo: CNAME
Nombre: *
Valor: cname.vercel-dns.com
```

### 3.3. Verificar Subdominios en Supabase

Asegúrate de que en tu base de datos Supabase, en la tabla `stores`, tengas registros como:

```sql
-- Tienda por defecto
INSERT INTO stores (id, subdomain, store_name, domain, is_active, is_public)
VALUES (
  'uuid-por-defecto',
  'default',
  'Tienda Principal',
  'tudominio.com',
  true,
  true
);

-- Tienda de repostería
INSERT INTO stores (id, subdomain, store_name, domain, is_active, is_public)
VALUES (
  'uuid-reposteria',
  'reposteria',
  'Tienda de Postres',
  'tudominio.com',
  true,
  true
);
```

## 🔄 Paso 4: Configuración de Supabase

### 4.1. URLs de Redirección

En el dashboard de Supabase, ve a **Authentication** → **URL Configuration**:

**Site URL:**
```
https://tudominio.com
```

**Redirect URLs** (agrega todas las variantes):
```
https://tudominio.com/auth/callback
https://tudominio.com/auth/reset-password
https://reposteria.tudominio.com/auth/callback
https://reposteria.tudominio.com/auth/reset-password
https://*.tudominio.com/auth/callback
https://*.tudominio.com/auth/reset-password
```

O si usas el dominio de Vercel:
```
https://tu-proyecto.vercel.app/auth/callback
https://tu-proyecto.vercel.app/auth/reset-password
```

### 4.2. Row Level Security (RLS)

Asegúrate de que las políticas RLS estén configuradas correctamente para permitir:
- Lectura pública de datos de tiendas
- Escritura solo para usuarios autenticados (donde corresponda)

## 🚀 Paso 5: Desplegar

### 5.1. Primer Despliegue

1. Haz clic en **"Deploy"** en Vercel
2. Espera a que el build termine
3. Verifica que no haya errores en los logs

### 5.2. Verificar Funcionamiento

1. **Dominio principal**: `https://tudominio.com`
2. **Subdominio**: `https://reposteria.tudominio.com`
3. Verifica que el middleware detecte correctamente el subdominio
4. Verifica que los estilos y contenido se carguen correctamente

## 🔍 Paso 6: Verificación y Troubleshooting

### 6.1. Verificar Middleware

El middleware debería:
- Detectar el subdominio correctamente
- Establecer el header `x-store-id`
- Establecer la cookie `store_id`

Puedes verificar esto en las **Developer Tools** → **Network** → **Headers**.

### 6.2. Problemas Comunes

#### **Subdominio no funciona**
- Verifica que el DNS esté configurado correctamente
- Verifica que el dominio esté agregado en Vercel
- Espera unos minutos para que los cambios DNS se propaguen

#### **Error 404 en subdominio**
- Verifica que el registro existe en la tabla `stores` de Supabase
- Verifica que `is_active = true` y `is_public = true`

#### **Estilos no se cargan**
- Verifica que las variables de entorno estén configuradas
- Verifica que `store_id` se esté pasando correctamente
- Revisa la consola del navegador para errores

#### **Autenticación no funciona**
- Verifica que las URLs de redirección estén configuradas en Supabase
- Verifica que `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` estén correctas

## 📝 Paso 7: Configuración Adicional (Opcional)

### 7.1. Variables de Entorno por Entorno

Puedes configurar variables diferentes para producción y preview:

**Production:**
```
NEXT_PUBLIC_SITE_URL=https://tudominio.com
```

**Preview:**
```
NEXT_PUBLIC_SITE_URL=https://tu-proyecto-git-branch.vercel.app
```

### 7.2. Configuración de Build

Si necesitas configuraciones especiales de build, puedes crear un `vercel.json` (ya existe en el proyecto):

```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"]
}
```

**Nota importante**: El archivo `vercel.json` actual NO tiene rewrites, lo cual es correcto para subdominios. El middleware de Next.js maneja el enrutamiento.

### 7.3. Monitoreo y Analytics

Vercel incluye analytics básico. Para más funcionalidades:
- **Vercel Analytics**: Actívalo en **Settings** → **Analytics**
- **Logs**: Disponibles en **Deployments** → **View Function Logs**

## ✅ Checklist Final

Antes de considerar el despliegue completo:

- [ ] Variables de entorno configuradas en Vercel
- [ ] Dominio principal agregado y verificado
- [ ] Subdominios configurados (o wildcard domain)
- [ ] URLs de redirección configuradas en Supabase
- [ ] Registros de tiendas en la base de datos Supabase
- [ ] Primer despliegue exitoso
- [ ] Dominio principal funciona correctamente
- [ ] Subdominios funcionan correctamente
- [ ] Autenticación funciona en todos los subdominios
- [ ] Estilos y contenido se cargan correctamente
- [ ] Emails se envían correctamente (si configuraste SMTP)

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs de Vercel en **Deployments**
2. Revisa la consola del navegador para errores
3. Verifica que todas las variables de entorno estén configuradas
4. Verifica que el DNS esté configurado correctamente
5. Consulta la [documentación de Vercel](https://vercel.com/docs)

## 📚 Recursos Adicionales

- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de DNS de Vercel](https://vercel.com/docs/concepts/projects/domains)






