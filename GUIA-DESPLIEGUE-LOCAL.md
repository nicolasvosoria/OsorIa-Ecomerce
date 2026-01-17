# 🚀 Guía Completa de Despliegue Local

Esta guía te ayudará a desplegar completamente el proyecto OsorIa E-commerce en tu máquina local.

## 📋 Requisitos Previos

### 1. Software Necesario

- **Node.js 18+**: [Descargar Node.js](https://nodejs.org/)
- **pnpm** (recomendado) o **npm**: 
  ```bash
  # Instalar pnpm globalmente
  npm install -g pnpm
  ```
- **Git**: Para clonar el repositorio (si no lo tienes)
- **Editor de código**: VS Code, Cursor, etc.

### 2. Cuenta de Supabase

- Crea una cuenta en [Supabase](https://supabase.com)
- Crea un nuevo proyecto
- Obtén las credenciales:
  - **URL del proyecto**: `https://tu-proyecto.supabase.co`
  - **Anon Key**: Clave pública anónima

## 🔧 Paso 1: Configuración del Proyecto

### 1.1. Clonar/Verificar el Repositorio

Si ya tienes el proyecto, salta este paso. Si no:

```bash
git clone <url-del-repositorio>
cd OsorIa-Ecomerce
```

### 1.2. Crear Archivo de Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con:

```env
# Supabase (REQUERIDO)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui

# URL del sitio (opcional, se detecta automáticamente en desarrollo)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Shopify (OPCIONAL - solo si usas Shopify)
# NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=tu-tienda.myshopify.com

# SMTP para Emails (OPCIONAL - solo si quieres enviar correos)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=tu-email@gmail.com
# SMTP_PASS=tu-contraseña-de-aplicación
# SMTP_FROM="Tu Tienda <tu-email@gmail.com>"
```

**Nota**: Ya tienes el `.env.local` creado con tus credenciales de Supabase.

### 1.3. Instalar Dependencias

```bash
# Opción 1: Con pnpm (recomendado)
pnpm install

# Opción 2: Con npm (si no tienes pnpm)
npm install --legacy-peer-deps
```

**Nota**: El flag `--legacy-peer-deps` es necesario porque el proyecto usa React 19 pero algunas dependencias requieren React 18.

## 🗄️ Paso 2: Configuración de la Base de Datos (Supabase)

### 2.1. Ejecutar Scripts SQL en Orden

Ve al **SQL Editor** en tu dashboard de Supabase y ejecuta los scripts en este orden:

#### **Orden de Ejecución de Scripts:**

1. **`19-create-user-profiles-table.sql`** - Tabla de perfiles de usuario
2. **`01-create-themes-table.sql`** - Tabla de temas
3. **`01-create-component-styles-table.sql`** - Tabla de estilos de componentes
4. **`04-create-fonts-table.sql`** - Tabla de fuentes
5. **`20-create-products-tables.sql`** - Tablas de productos y categorías
6. **`30-create-stores-table.sql`** - Tabla de tiendas (MULTI-TIENDA)
7. **`31-add-store-id-to-products.sql`** - Relacionar productos con tiendas
8. **`29-create-orders-tables.sql`** - Tablas de pedidos
9. **`32-add-store-id-to-orders.sql`** - Relacionar pedidos con tiendas
10. **`33-add-store-id-to-styles.sql`** - Relacionar estilos con tiendas
11. **`18-fix-rls-y-datos-final.sql`** - Configurar RLS (Row Level Security)
12. **`34-create-reposteria-store.sql`** - Crear tienda de ejemplo "reposteria"
13. **`35-update-reposteria-theme.sql`** - Configurar tema para repostería

#### **Scripts Adicionales (Opcionales):**

- **`21-add-user-roles.sql`** - Agregar roles de usuario
- **`22-create-cart-tables.sql`** - Tabla de carritos (si no usas Shopify)
- **`23-create-admin-user.sql`** - Crear usuario administrador
- **`27-insert-sample-products.sql`** - Insertar productos de ejemplo
- **`27-setup-storage-bucket.sql`** - Configurar bucket de almacenamiento

### 2.2. Verificar Funciones RPC

Asegúrate de que la función `get_store_by_subdomain` esté creada. Debería estar en el script `30-create-stores-table.sql`.

### 2.3. Configurar Row Level Security (RLS)

El script `18-fix-rls-y-datos-final.sql` debería configurar las políticas RLS. Verifica que:

- Las tablas `stores`, `user_profiles`, `store_items` tengan RLS habilitado
- Las políticas permitan lectura pública de `stores` activas
- Las políticas permitan escritura solo para usuarios autenticados donde corresponda

### 2.4. Crear Tienda por Defecto

Si no ejecutaste el script `34-create-reposteria-store.sql`, crea al menos una tienda por defecto:

```sql
INSERT INTO public.stores (
  subdomain,
  store_name,
  domain,
  is_active,
  is_public,
  currency_code
) VALUES (
  'default',
  'Tienda Principal',
  'localhost',
  TRUE,
  TRUE,
  'COP'
) ON CONFLICT (subdomain) DO NOTHING;
```

## 🌐 Paso 3: Configurar Subdominios Locales (Multi-Tienda)

Para probar la funcionalidad multi-tienda localmente, necesitas configurar el archivo `hosts` de Windows.

### 3.1. Usar el Script PowerShell (Recomendado)

Ejecuta el script `configurar-hosts.ps1` como administrador:

```powershell
# Abre PowerShell como Administrador y ejecuta:
.\scripts\configurar-hosts.ps1
```

### 3.2. Configuración Manual del Archivo Hosts

Si prefieres hacerlo manualmente:

1. Abre el **Bloc de notas como Administrador**
2. Abre el archivo: `C:\Windows\System32\drivers\etc\hosts`
3. Agrega estas líneas al final:

```
127.0.0.1    localhost
127.0.0.1    reposteria.localhost
127.0.0.1    default.localhost
```

4. Guarda el archivo

### 3.3. Verificar Configuración

```bash
# En PowerShell o CMD
ping reposteria.localhost
```

Debería responder con `127.0.0.1`.

## 🚀 Paso 4: Iniciar el Servidor de Desarrollo

### 4.1. Iniciar el Servidor

```bash
# Con pnpm
pnpm dev

# Con npm
npm run dev
```

El servidor debería iniciar en `http://localhost:3000`

### 4.2. Probar las URLs

- **Tienda por defecto**: `http://localhost:3000`
- **Tienda de repostería**: `http://reposteria.localhost:3000`
- **Tienda por defecto (subdominio)**: `http://default.localhost:3000`

## ✅ Paso 5: Verificación

### 5.1. Verificar que el Proyecto Funciona

1. **Abre el navegador** en `http://localhost:3000`
2. **Verifica la consola del navegador** (F12) - no debería haber errores críticos
3. **Verifica la consola del servidor** - debería mostrar "Ready" sin errores

### 5.2. Verificar Multi-Tienda

1. Accede a `http://reposteria.localhost:3000`
2. El middleware debería detectar el subdominio "reposteria"
3. Debería cargar la tienda correspondiente desde Supabase

### 5.3. Verificar Autenticación

1. Intenta registrarte en `/auth` (si existe la ruta)
2. Verifica que se cree el perfil en `user_profiles`
3. Intenta iniciar sesión

### 5.4. Verificar Base de Datos

En Supabase, verifica que:

- ✅ Existe al menos una tienda en la tabla `stores`
- ✅ La función `get_store_by_subdomain` existe y funciona
- ✅ Las políticas RLS están configuradas
- ✅ Existen productos (si ejecutaste el script de productos de ejemplo)

## 🔍 Troubleshooting

### Problema: "Supabase no configurado"

**Solución**: Verifica que el archivo `.env.local` existe y tiene las variables correctas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Problema: "Tienda no encontrada"

**Solución**: 
1. Verifica que existe una tienda con `subdomain = 'default'` en Supabase
2. Verifica que la función `get_store_by_subdomain` existe
3. Revisa los logs del middleware en la consola del servidor

### Problema: "Error de dependencias"

**Solución**:
```bash
# Limpia e instala de nuevo
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
# O con pnpm
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Problema: "Subdominio no funciona"

**Solución**:
1. Verifica que el archivo `hosts` tiene las entradas correctas
2. Reinicia el navegador después de modificar `hosts`
3. Prueba con `http://reposteria.localhost:3000` (no olvides el puerto)

### Problema: "Error de RLS en Supabase"

**Solución**:
1. Ejecuta el script `18-fix-rls-y-datos-final.sql`
2. Verifica que las políticas RLS permiten lectura pública de `stores`
3. En desarrollo, puedes deshabilitar temporalmente RLS para debugging (no recomendado en producción)

### Problema: "El servidor no inicia"

**Solución**:
1. Verifica que el puerto 3000 no está en uso:
   ```bash
   netstat -ano | findstr :3000
   ```
2. Usa otro puerto:
   ```bash
   pnpm dev -- -p 3001
   ```

## 📝 Checklist Final

Antes de considerar el despliegue completo:

- [ ] Node.js 18+ instalado
- [ ] pnpm o npm instalado
- [ ] Archivo `.env.local` creado con credenciales de Supabase
- [ ] Dependencias instaladas (`node_modules` existe)
- [ ] Scripts SQL ejecutados en Supabase en el orden correcto
- [ ] Al menos una tienda creada en la tabla `stores`
- [ ] Función `get_store_by_subdomain` creada y funcionando
- [ ] Archivo `hosts` configurado para subdominios locales
- [ ] Servidor de desarrollo inicia sin errores
- [ ] `http://localhost:3000` carga correctamente
- [ ] `http://reposteria.localhost:3000` carga correctamente
- [ ] No hay errores en la consola del navegador
- [ ] No hay errores en la consola del servidor

## 🎉 ¡Listo!

Si completaste todos los pasos, tu proyecto debería estar funcionando localmente. Ahora puedes:

- Desarrollar nuevas funcionalidades
- Probar cambios en el código
- Ver los cambios en tiempo real con hot-reload
- Probar la funcionalidad multi-tienda con diferentes subdominios

## 📚 Próximos Pasos

- **Despliegue en Vercel**: Consulta `GUIA-DESPLIEGUE-VERCEL.md`
- **Configurar Emails**: Agrega las variables SMTP en `.env.local`
- **Integrar Shopify**: Agrega `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` si lo necesitas
- **Agregar más tiendas**: Crea más registros en la tabla `stores`

## 🆘 Soporte

Si tienes problemas:

1. Revisa los logs del servidor (consola donde ejecutaste `pnpm dev`)
2. Revisa la consola del navegador (F12 → Console)
3. Verifica que todas las variables de entorno estén configuradas
4. Verifica que los scripts SQL se ejecutaron correctamente
5. Consulta la documentación de [Next.js](https://nextjs.org/docs) y [Supabase](https://supabase.com/docs)
