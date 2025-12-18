# 🚀 Guía de Instalación y Ejecución Local

Esta guía te ayudará a configurar y ejecutar el proyecto **Osoria E-commerce** en tu entorno local.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** 18 o superior ([Descargar Node.js](https://nodejs.org/))
- **pnpm** (recomendado) o **npm** 
  - Para instalar pnpm: `npm install -g pnpm`
- **Git** ([Descargar Git](https://git-scm.com/))
- Una cuenta de **Supabase** ([Crear cuenta gratuita](https://supabase.com/))
- (Opcional) Una tienda de **Shopify** si deseas integrar productos de Shopify

## 🔧 Paso 1: Clonar el Repositorio

Si aún no has clonado el repositorio:

```bash
git clone <url-del-repositorio>
cd OsorIa-Ecomerce
```

## 📦 Paso 2: Instalar Dependencias

Instala todas las dependencias del proyecto usando pnpm (recomendado):

```bash
pnpm install
```

Si prefieres usar npm:

```bash
npm install
```

> ⚠️ **Nota:** El proyecto está optimizado para pnpm. Si usas npm, algunas dependencias podrían instalarse de manera diferente.

## 🔐 Paso 3: Configurar Variables de Entorno

### 3.1 Crear archivo de variables de entorno

**Debes usar `.env.local` (NO solo `.env`)** para desarrollo local.

Next.js carga los archivos de entorno en este orden de prioridad:
1. `.env.local` - **Mayor prioridad** (siempre cargado, excepto en tests)
2. `.env.development` o `.env.production` - Según el modo de ejecución
3. `.env` - Menor prioridad (siempre cargado)

**¿Por qué `.env.local`?**
- ✅ Tiene la **mayor prioridad** sobre otros archivos `.env`
- ✅ Está **automáticamente ignorado por Git** (seguro para credenciales)
- ✅ Es específico para **configuración local** que no debe compartirse
- ✅ No se carga durante los tests (evita conflictos)

Crea el archivo `.env.local` en la raíz del proyecto:

```bash
# Windows (PowerShell)
New-Item -Path .env.local -ItemType File

# Linux/Mac
touch .env.local
```

> 💡 **Nota:** Si usas solo `.env` en lugar de `.env.local`, las variables pueden ser sobrescritas por otros archivos de entorno y el archivo podría no estar correctamente ignorado por Git.

### 3.2 Configurar variables de Supabase (Obligatorias)

Obtén las credenciales de tu proyecto Supabase:

1. Ve a [Supabase Dashboard](https://app.supabase.com/)
2. Selecciona tu proyecto (o crea uno nuevo)
3. Ve a **Settings** → **API**
4. Copia los siguientes valores:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Agrega estas variables a tu archivo `.env.local`:

```env
# Supabase - OBLIGATORIAS
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 3.3 Configurar variables opcionales

#### Shopify (Opcional)

Si deseas integrar productos de Shopify:

```env
# Shopify - OPCIONAL
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com
```

#### URL del sitio (Opcional)

Para desarrollo local, puedes usar:

```env
# URL del sitio - OPCIONAL (por defecto usa localhost:3000)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3.4 Archivo .env.local completo (ejemplo)

```env
# Supabase - OBLIGATORIAS
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Shopify - OPCIONAL
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com

# URL del sitio - OPCIONAL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> ⚠️ **Importante:** Nunca subas el archivo `.env.local` al repositorio. Está incluido en `.gitignore` por seguridad.

## 🗄️ Paso 4: Configurar Base de Datos en Supabase

### 4.1 Acceder al SQL Editor

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com/)
2. Navega a **SQL Editor** en el menú lateral

### 4.2 Ejecutar Scripts de Inicialización

Ejecuta los scripts SQL en el siguiente orden (en el SQL Editor de Supabase):

#### Script 1: Inicialización Completa
```sql
-- Ejecuta el contenido de: scripts/00-inicializacion-completa.sql
```
Abre el archivo `scripts/00-inicializacion-completa.sql` y copia su contenido al SQL Editor.

#### Script 2: Tablas de Temas
```sql
-- Ejecuta: scripts/01-create-themes-table.sql
```

#### Script 3: Tablas de Estilos de Componentes
```sql
-- Ejecuta: scripts/01-create-component-styles-table.sql
```

#### Script 4: Tablas de Fuentes
```sql
-- Ejecuta: scripts/04-create-fonts-table.sql
```

#### Script 5: Correcciones de Permisos
```sql
-- Ejecuta: scripts/07-fix-themes-fonts-permissions.sql
```

#### Script 6: Correcciones de Fuentes
```sql
-- Ejecuta: scripts/14-fix-font-display-name.sql
```

#### Script 7: Correcciones Finales de RLS
```sql
-- Ejecuta: scripts/18-fix-rls-y-datos-final.sql
```

#### Script 8: Perfiles de Usuario
```sql
-- Ejecuta: scripts/19-create-user-profiles-table.sql
```

#### Script 9: Tablas de Productos
```sql
-- Ejecuta: scripts/20-create-products-tables.sql
```

#### Script 10: Roles de Usuario
```sql
-- Ejecuta: scripts/21-add-user-roles.sql
```

#### Script 11: Tablas de Carrito
```sql
-- Ejecuta: scripts/22-create-cart-tables.sql
```

#### Script 12: Usuario Administrador
```sql
-- Ejecuta: scripts/23-create-admin-user.sql
```

#### Script 13: Configuración de Admin y Textos
```sql
-- Ejecuta: scripts/24-setup-admin-y-textos.sql
```

#### Script 14: Correcciones de Roles
```sql
-- Ejecuta: scripts/25-fix-role-constraint.sql
```

#### Script 15: Rol por Defecto
```sql
-- Ejecuta: scripts/26-ensure-default-user-role.sql
```

#### Script 16: Productos de Ejemplo (Opcional pero Recomendado)
```sql
-- Ejecuta: scripts/27-insert-sample-products.sql
```

Este script inserta productos de ejemplo en la base de datos:
- **Café:** 4 productos (Honey Process, Natural Process, Washed Process, y Trilogía)
- **Electrónica:** 4 productos (Auriculares Premium, Altavoz Bluetooth, Proyector Mini, Audífonos Inalámbricos)
- **Accesorios:** 2 productos (Soporte para Laptop, Funda para Teléfono)

Cada producto incluye:
- Variantes (cuando aplica)
- Imágenes
- Opciones (como colores)
- Categorías

> 💡 **Consejo:** Puedes ejecutar todos los scripts en una sola sesión copiando y pegando su contenido en el SQL Editor, o ejecutarlos uno por uno para verificar que cada uno se ejecute correctamente.

### 4.3 Configurar URLs de Redirección en Supabase

Para que la autenticación funcione correctamente:

1. Ve a **Authentication** → **URL Configuration** en Supabase Dashboard
2. Configura las siguientes URLs:

   **Site URL:**
   ```
   http://localhost:3000
   ```

   **Redirect URLs (agregar cada una):**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/reset-password
   ```

3. Guarda los cambios

## 🚀 Paso 5: Ejecutar el Servidor de Desarrollo

Una vez configurado todo, ejecuta el servidor de desarrollo:

```bash
pnpm dev
```

O con npm:

```bash
npm run dev
```

El servidor se iniciará en [http://localhost:3000](http://localhost:3000)

Abre tu navegador y visita la URL para ver la aplicación funcionando.

## ✅ Verificación

### Verificar que todo funciona:

1. **Página principal:** Debería cargar sin errores en `http://localhost:3000`
2. **Autenticación:** Prueba registrarte o iniciar sesión
3. **Base de datos:** Verifica que puedas ver productos y categorías
4. **Tienda:** Visita `/shop` para ver los productos de ejemplo
5. **Productos individuales:** Haz clic en cualquier producto para ver su página de detalle
6. **Panel de administración:** Si creaste un usuario admin, accede a `/admin`

### Verificar productos en la base de datos:

Puedes ejecutar estas consultas en el SQL Editor de Supabase para verificar:

```sql
-- Ver todos los productos
SELECT item_name, base_price, is_featured, is_active 
FROM public.store_items 
ORDER BY display_order;

-- Ver categorías
SELECT category_name, display_order, is_active 
FROM public.item_categories 
ORDER BY display_order;

-- Ver productos con sus categorías
SELECT si.item_name, ic.category_name, si.base_price
FROM public.store_items si
LEFT JOIN public.item_categories ic ON si.category_id = ic.id
ORDER BY si.display_order;
```

## 🛠️ Comandos Disponibles

```bash
# Desarrollo
pnpm dev          # Inicia el servidor de desarrollo

# Producción
pnpm build        # Construye la aplicación para producción
pnpm start         # Inicia el servidor de producción (después de build)

# Calidad de código
pnpm lint         # Ejecuta el linter para verificar el código
```

## 🐛 Solución de Problemas Comunes

### Error: "Supabase no configurado"

**Solución:** 
- Verifica que el archivo se llame **`.env.local`** (NO solo `.env`)
- Asegúrate de que las variables de entorno estén correctamente configuradas en `.env.local`
- Verifica que el archivo esté en la raíz del proyecto (mismo nivel que `package.json`)
- Reinicia el servidor de desarrollo después de crear o modificar el archivo `.env.local`

### Error: "Failed to fetch" o problemas de conexión

**Solución:** 
- Verifica que las credenciales de Supabase sean correctas
- Asegúrate de que las políticas RLS (Row Level Security) estén configuradas correctamente
- Revisa que hayas ejecutado todos los scripts SQL necesarios

### Error: "Module not found" o problemas de dependencias

**Solución:**
```bash
# Elimina node_modules y reinstala
rm -rf node_modules
pnpm install
```

### Error de autenticación o redirección

**Solución:**
- Verifica que las URLs de redirección estén configuradas en Supabase
- Asegúrate de que `NEXT_PUBLIC_SITE_URL` esté configurado correctamente
- Revisa la consola del navegador para ver errores específicos

### Variables de entorno no se cargan o se usan valores incorrectos

**Solución:**
- **Asegúrate de usar `.env.local` y NO solo `.env`**
- Si tienes ambos archivos (`.env` y `.env.local`), `.env.local` tiene prioridad
- Reinicia el servidor de desarrollo después de modificar variables de entorno
- Verifica que no haya espacios alrededor del signo `=` en las variables
- Las variables deben empezar con `NEXT_PUBLIC_` para estar disponibles en el cliente
- Ejemplo correcto: `NEXT_PUBLIC_SUPABASE_URL=https://...`
- Ejemplo incorrecto: `NEXT_PUBLIC_SUPABASE_URL = https://...` (con espacios)

### Problemas con TypeScript

**Solución:** El proyecto tiene configurado `ignoreBuildErrors: true` en `next.config.mjs`, pero para desarrollo puedes verificar errores con:

```bash
pnpm build
```

## 📚 Recursos Adicionales

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Shopify](https://shopify.dev/docs)
- [Documentación de pnpm](https://pnpm.io/)

## 🎯 Próximos Pasos

Una vez que tengas el proyecto funcionando localmente:

1. Revisa la [Guía de Usuarios y Administradores](./GUIA-USUARIOS-ADMINISTRADORES.md)
2. Consulta la [Guía de Migración de Shopify](./MIGRATION-SHOPIFY-TO-DB.md) si necesitas migrar productos
3. Explora el panel de administración en `/admin`

## 📝 Notas Importantes

- **Seguridad:** Nunca compartas tus credenciales de Supabase o Shopify
- **Base de datos:** Los scripts SQL deben ejecutarse en orden para evitar errores
- **Variables de entorno:** 
  - **DEBES usar `.env.local`** (NO solo `.env`) para desarrollo local
  - El archivo `.env.local` es específico para desarrollo local y está automáticamente ignorado por Git
  - Tiene mayor prioridad que otros archivos `.env` en Next.js
  - Reinicia el servidor después de modificar variables de entorno
- **Versiones:** Este proyecto usa Next.js 16 y React 19. Asegúrate de tener Node.js 18+ instalado

---

¿Necesitas ayuda? Revisa la documentación del proyecto o consulta los archivos de configuración para más detalles.

