# Solución de Errores en Vercel

Este documento explica cómo resolver los errores que aparecen al desplegar en Vercel.

## 🔴 Errores Comunes

### 1. ⚠️ Middleware Deprecado: "The 'middleware' file convention is deprecated"

**Problema:** Next.js 16 ha deprecado `middleware.ts` en favor de `proxy.ts`.

**Solución:**
- ✅ Ya se ha renombrado `middleware.ts` → `proxy.ts`
- ✅ Ya se cambió `export async function middleware()` → `export async function proxy()`
- ✅ El archivo `proxy.ts` ahora maneja toda la lógica de subdominios

**Verificación:**
```bash
# Verifica que existe proxy.ts y no middleware.ts
ls -la proxy.ts
ls -la middleware.ts  # Debe dar error (archivo no existe)
```

### 2. ❌ Error de Build: `app/dashboard/page.tsx:21:1`

**Problema:** Turbopack puede tener problemas con imports dinámicos o con funciones de cliente en Server Components.

**Posibles causas:**
1. `getDashboardStats` usa `getSupabaseBrowserClient()` que puede no estar disponible durante build time
2. Problemas con imports o tipos durante la compilación

**Soluciones:**

#### Opción A: Hacer el import dinámico (Recomendado)

Modificar `app/dashboard/page.tsx` para importar `getDashboardStats` de forma dinámica:

```typescript
// Cambiar esto:
import { getDashboardStats } from "@/lib/supabase/stats-api"

// Por esto (importación dinámica):
const loadStats = async () => {
  if (!isAdmin) return
  
  setLoadingStats(true)
  try {
    // Importación dinámica
    const { getDashboardStats } = await import("@/lib/supabase/stats-api")
    const dashboardStats = await getDashboardStats()
    setStats(dashboardStats)
  } catch (error) {
    console.error("[Dashboard] Error al cargar estadísticas:", error)
  } finally {
    setLoadingStats(false)
  }
}
```

#### Opción B: Verificar que `stats-api.ts` no tiene imports problemáticos

Asegúrate de que `lib/supabase/stats-api.ts` usa correctamente `getSupabaseBrowserClient()` solo en funciones asíncronas.

#### Opción C: Usar Server Actions (Si el dashboard no requiere interactividad en tiempo real)

Si prefieres, puedes mover la lógica de estadísticas a Server Actions, pero esto requeriría cambiar más código.

### 3. 🔧 Verificación de Build Local

Antes de desplegar, prueba el build localmente:

```bash
# Instalar dependencias
pnpm install

# Build de producción (sin Turbopack)
pnpm build

# Si el build funciona, probar con Turbopack
pnpm build --turbopack
```

Si el build local funciona pero falla en Vercel:
- Verifica que todas las variables de entorno están configuradas en Vercel
- Revisa los logs de build en Vercel para ver el error exacto

### 4. 📋 Checklist para Despliegue

- [x] Renombrar `middleware.ts` → `proxy.ts`
- [x] Cambiar `export function middleware()` → `export function proxy()`
- [ ] Verificar que no hay referencias a `middleware.ts` en otros archivos
- [ ] Probar build local: `pnpm build`
- [ ] Verificar variables de entorno en Vercel
- [ ] Revisar logs de build en Vercel para errores específicos

## 🐛 Debugging

### Ver logs de build en Vercel

1. Ve a Vercel Dashboard
2. Tu Proyecto → Deployments
3. Haz clic en el deployment fallido
4. Revisa la sección "Build Logs" para ver el error exacto

### Verificar imports problemáticos

```bash
# Buscar referencias a middleware (no debería haber ninguna)
grep -r "middleware" --exclude-dir=node_modules --exclude="*.md"

# Buscar imports problemáticos
grep -r "getDashboardStats" --exclude-dir=node_modules
```

## 💡 Notas Importantes

1. **Next.js 16+**: Usa `proxy.ts` en lugar de `middleware.ts`
2. **Turbopack**: Puede tener problemas con algunos imports dinámicos o tipos complejos
3. **Build Time**: Durante el build, algunas funciones de cliente pueden no estar disponibles
4. **Variables de Entorno**: Asegúrate de que todas las variables necesarias estén en Vercel

## 🔄 Si el problema persiste

1. **Desactivar Turbopack temporalmente:**
   - En `next.config.js` o `next.config.mjs`, no uses `experimental.turbo`
   - O usa `pnpm build` sin la flag `--turbopack`

2. **Verificar versiones:**
   ```bash
   node --version
   pnpm --version
   ```

3. **Limpiar caché:**
   ```bash
   rm -rf .next
   rm -rf node_modules
   pnpm install
   pnpm build
   ```


