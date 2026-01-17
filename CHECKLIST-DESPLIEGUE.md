# ✅ Checklist de Despliegue Local

Usa esta checklist para asegurarte de que todo esté configurado correctamente.

## 📦 Instalación y Configuración

- [ ] **Node.js 18+ instalado**
  ```bash
  node --version  # Debe ser v18 o superior
  ```

- [ ] **pnpm instalado** (recomendado) o npm
  ```bash
  pnpm --version  # O npm --version
  ```

- [ ] **Archivo `.env.local` creado** en la raíz del proyecto
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
  - [ ] Variables opcionales configuradas (si las necesitas)

- [ ] **Dependencias instaladas**
  ```bash
  npm install --legacy-peer-deps
  # O
  pnpm install
  ```
  - [ ] Carpeta `node_modules` existe
  - [ ] No hay errores críticos en la instalación

## 🗄️ Base de Datos (Supabase)

- [ ] **Proyecto de Supabase creado**
  - [ ] URL del proyecto obtenida
  - [ ] Anon Key obtenida

- [ ] **Scripts SQL ejecutados en orden:**
  - [ ] `19-create-user-profiles-table.sql`
  - [ ] `01-create-themes-table.sql`
  - [ ] `01-create-component-styles-table.sql`
  - [ ] `04-create-fonts-table.sql`
  - [ ] `20-create-products-tables.sql`
  - [ ] `30-create-stores-table.sql`
  - [ ] `31-add-store-id-to-products.sql`
  - [ ] `29-create-orders-tables.sql`
  - [ ] `32-add-store-id-to-orders.sql`
  - [ ] `33-add-store-id-to-styles.sql`
  - [ ] `18-fix-rls-y-datos-final.sql`
  - [ ] `34-create-reposteria-store.sql` (opcional, para ejemplo)
  - [ ] `35-update-reposteria-theme.sql` (opcional)

- [ ] **Función RPC creada:**
  - [ ] `get_store_by_subdomain` existe y funciona

- [ ] **Tienda por defecto creada:**
  ```sql
  SELECT * FROM stores WHERE subdomain = 'default';
  ```
  - [ ] Al menos una tienda existe en la tabla `stores`

- [ ] **RLS configurado:**
  - [ ] Políticas RLS habilitadas en tablas principales
  - [ ] Lectura pública permitida para `stores` activas

## 🌐 Configuración Local (Multi-Tienda)

- [ ] **Archivo hosts configurado:**
  - [ ] Ejecutado `scripts/configurar-hosts.ps1` como administrador
  - [ ] O configurado manualmente en `C:\Windows\System32\drivers\etc\hosts`
  - [ ] Entradas agregadas:
    - `127.0.0.1    reposteria.localhost`
    - `127.0.0.1    default.localhost`

- [ ] **Subdominios verificados:**
  ```bash
  ping reposteria.localhost  # Debe responder 127.0.0.1
  ```

## 🚀 Servidor de Desarrollo

- [ ] **Servidor inicia correctamente:**
  ```bash
  pnpm dev
  # O
  npm run dev
  ```
  - [ ] No hay errores en la consola
  - [ ] Muestra "Ready" o similar
  - [ ] Puerto 3000 está disponible

- [ ] **URLs funcionan:**
  - [ ] `http://localhost:3000` carga correctamente
  - [ ] `http://reposteria.localhost:3000` carga correctamente (si configuraste hosts)
  - [ ] No hay errores 404 críticos

## 🔍 Verificación Final

- [ ] **Consola del navegador:**
  - [ ] No hay errores críticos en la consola (F12)
  - [ ] No hay errores de red (404, 500, etc.)

- [ ] **Consola del servidor:**
  - [ ] No hay errores de compilación
  - [ ] No hay errores de conexión a Supabase
  - [ ] Middleware detecta subdominios correctamente

- [ ] **Funcionalidades básicas:**
  - [ ] La página principal carga
  - [ ] El header/navegación funciona
  - [ ] Los estilos se cargan correctamente
  - [ ] La tienda se detecta correctamente (verifica en Network → Headers → x-store-id)

- [ ] **Autenticación (si aplica):**
  - [ ] Puedes registrarte (si existe la ruta)
  - [ ] Puedes iniciar sesión (si existe la ruta)
  - [ ] El perfil se crea en `user_profiles`

## 📝 Notas Adicionales

### Si algo no funciona:

1. **Revisa los logs del servidor** - La consola donde ejecutaste `pnpm dev`
2. **Revisa la consola del navegador** - F12 → Console
3. **Verifica las variables de entorno** - Asegúrate de que `.env.local` existe y tiene las variables correctas
4. **Verifica la base de datos** - Asegúrate de que los scripts SQL se ejecutaron correctamente
5. **Revisa la guía completa** - Consulta `GUIA-DESPLIEGUE-LOCAL.md`

### Comandos útiles:

```bash
# Verificar Node.js
node --version

# Verificar pnpm
pnpm --version

# Limpiar e instalar de nuevo
rm -rf node_modules
npm install --legacy-peer-deps

# Verificar puerto
netstat -ano | findstr :3000

# Iniciar servidor en otro puerto
pnpm dev -- -p 3001
```

## 🎉 ¡Listo para Desarrollar!

Si completaste todos los pasos, tu proyecto está listo para desarrollo local.

---

**Última actualización**: $(Get-Date -Format "yyyy-MM-dd")
