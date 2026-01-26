# 🚀 Guía de Despliegue Local - OsorIa E-commerce

Esta guía te ayudará a configurar y ejecutar el proyecto en tu máquina local.

## 📋 Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

1. **Node.js 18 o superior**
   - Verifica con: `node --version`
   - Descarga desde: https://nodejs.org/

2. **pnpm (recomendado) o npm**
   - Instalar pnpm: `npm install -g pnpm`
   - Verifica con: `pnpm --version`

3. **Cuenta de Supabase**
   - Ya tienes las credenciales en `.env.local` ✅

## 🔧 Pasos de Instalación

### 1. Instalar Dependencias

```bash
pnpm install
```

O si prefieres npm:
```bash
npm install
```

### 2. Variables de Entorno ✅

Ya tienes el archivo `.env.local` configurado con:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Variables opcionales** (si las necesitas):
```env
# Shopify (opcional)
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com

# URL del sitio (opcional, se auto-detecta en desarrollo)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Deshabilitar multi-tenant (opcional)
DISABLE_SUBDOMAIN_MULTI_TENANT=false
DEFAULT_STORE_ID=uuid-de-tu-tienda
```

### 3. Configurar Base de Datos en Supabase

**IMPORTANTE:** Debes ejecutar los scripts SQL en el orden correcto en el SQL Editor de Supabase.

#### Orden de Ejecución de Scripts SQL:

1. **Perfiles de Usuario**
   ```sql
   -- Ejecutar: scripts/19-create-user-profiles-table.sql
   ```

2. **Temas y Estilos**
   ```sql
   -- Ejecutar: scripts/01-create-themes-table.sql
   -- Ejecutar: scripts/01-create-component-styles-table.sql
   -- Ejecutar: scripts/04-create-fonts-table.sql
   ```

3. **Productos**
   ```sql
   -- Ejecutar: scripts/20-create-products-tables.sql
   ```

4. **Tiendas (Multi-tenant)**
   ```sql
   -- Ejecutar: scripts/30-create-stores-table.sql
   ```

5. **Relacionar Productos con Tiendas**
   ```sql
   -- Ejecutar: scripts/31-add-store-id-to-products.sql
   ```

6. **Pedidos**
   ```sql
   -- Ejecutar: scripts/29-create-orders-tables.sql
   ```

7. **Relacionar Pedidos con Tiendas**
   ```sql
   -- Ejecutar: scripts/32-add-store-id-to-orders.sql
   ```

8. **Relacionar Estilos con Tiendas**
   ```sql
   -- Ejecutar: scripts/33-add-store-id-to-styles.sql
   ```

9. **Configurar RLS (Row Level Security)**
   ```sql
   -- Ejecutar: scripts/18-fix-rls-y-datos-final.sql
   ```

10. **Crear Tienda de Ejemplo (Opcional)**
    ```sql
    -- Ejecutar: scripts/34-create-reposteria-store.sql
    -- Ejecutar: scripts/35-update-reposteria-theme.sql
    ```

#### Scripts Opcionales:

- `21-add-user-roles.sql` - Agregar roles de usuario (user/admin)
- `23-create-admin-user.sql` - Crear usuario administrador
- `27-insert-sample-products.sql` - Insertar productos de ejemplo
- `27-setup-storage-bucket.sql` - Configurar bucket de almacenamiento

**💡 Tip:** Puedes ver el orden completo en `scripts/inicializar-base-datos.sql`

### 4. Configurar URLs de Redirección en Supabase

Para que la autenticación funcione correctamente:

1. Ve a tu **Supabase Dashboard** → **Authentication** → **URL Configuration**

2. Configura las siguientes URLs:

   **Site URL:**
   ```
   http://localhost:3000
   ```

   **Redirect URLs** (agregar cada una):
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/auth/reset-password
   ```

3. Si vas a usar subdominios locales (ej: `reposteria.localhost:3000`), agrega también:
   ```
   http://reposteria.localhost:3000/auth/callback
   http://reposteria.localhost:3000/auth/reset-password
   ```

### 5. Configurar Subdominios Locales (Opcional)

Si quieres probar el sistema multi-tienda con subdominios:

#### En Windows (PowerShell como Administrador):

Edita el archivo `C:\Windows\System32\drivers\etc\hosts` y agrega:

```
127.0.0.1    localhost
127.0.0.1    reposteria.localhost
127.0.0.1    default.localhost
```

O ejecuta el script PowerShell:
```powershell
.\scripts\configurar-hosts.ps1
```

#### En Linux/Mac:

Edita `/etc/hosts` y agrega:

```
127.0.0.1    localhost
127.0.0.1    reposteria.localhost
127.0.0.1    default.localhost
```

### 6. Ejecutar el Servidor de Desarrollo

```bash
pnpm dev
```

O con npm:
```bash
npm run dev
```

El proyecto estará disponible en:
- **URL principal:** http://localhost:3000
- **Tienda repostería:** http://reposteria.localhost:3000 (si configuraste hosts)

## ✅ Verificación

### Verificar que todo funciona:

1. **Abrir el navegador:**
   - http://localhost:3000

2. **Verificar autenticación:**
   - Intenta registrarte o iniciar sesión
   - Deberías poder crear una cuenta

3. **Verificar base de datos:**
   - Ve a `/admin` (si tienes usuario admin)
   - Verifica que puedes ver productos, pedidos, etc.

4. **Verificar multi-tienda:**
   - Accede a http://reposteria.localhost:3000 (si configuraste hosts)
   - Deberías ver estilos personalizados

## 🔍 Solución de Problemas

### Error: "Supabase no configurado"
- Verifica que `.env.local` existe y tiene las variables correctas
- Reinicia el servidor de desarrollo después de crear `.env.local`

### Error: "No se pudo obtener store_id"
- Verifica que ejecutaste `30-create-stores-table.sql`
- Verifica que existe al menos una tienda en la tabla `stores`
- Verifica que la función `get_store_by_subdomain` existe

### Error: "Tabla no existe"
- Verifica que ejecutaste todos los scripts SQL en orden
- Revisa los logs en Supabase SQL Editor

### Error de autenticación
- Verifica las URLs de redirección en Supabase Dashboard
- Asegúrate de que `http://localhost:3000` está en Site URL

### Error: "Cannot find module"
- Ejecuta `pnpm install` nuevamente
- Elimina `node_modules` y `.next` y vuelve a instalar:
  ```bash
  rm -rf node_modules .next
  pnpm install
  ```

## 📝 Comandos Útiles

```bash
# Desarrollo
pnpm dev

# Build de producción
pnpm build

# Ejecutar build de producción
pnpm start

# Linting
pnpm lint

# Tests
pnpm test
pnpm test:ui
pnpm test:coverage
```

## 🎯 Próximos Pasos

1. **Crear un usuario administrador:**
   - Ejecuta `scripts/23-create-admin-user.sql` en Supabase
   - O crea un usuario desde la app y cambia su rol a `admin` en Supabase

2. **Agregar productos:**
   - Ejecuta `scripts/27-insert-sample-products.sql` para datos de ejemplo
   - O usa el panel de administración en `/admin/products`

3. **Personalizar temas:**
   - Ve a `/admin` y personaliza los temas
   - O ejecuta los scripts de temas en Supabase

4. **Configurar email (opcional):**
   - Configura nodemailer para envío de correos de confirmación
   - Variables de entorno adicionales pueden ser necesarias

## 📚 Recursos Adicionales

- **Documentación Next.js:** https://nextjs.org/docs
- **Documentación Supabase:** https://supabase.com/docs
- **Documentación del proyecto:** Ver `README.md` y archivos en `scripts/`

---

¡Listo! Tu proyecto debería estar funcionando localmente. 🎉
