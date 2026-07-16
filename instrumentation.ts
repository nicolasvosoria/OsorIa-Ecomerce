import { assertAdminCookieSecretConfigured } from '@/lib/admin/production-env-guard'

// Solo el runtime Node.js necesita este chequeo: es el único que arranca el
// servidor real (proxy.ts fuerza nodejs en Next 16 y la app no usa rutas
// edge). Next también invoca register() durante el build, pero se salta ese
// llamado internamente en la fase 'phase-production-build', así que este
// guard nunca corre en `next build` — solo al arrancar `next dev`/`next start`.
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return
  }

  assertAdminCookieSecretConfigured({
    nodeEnv: process.env.NODE_ENV,
    adminCookieSecret: process.env.ADMIN_COOKIE_SECRET,
  })
}
