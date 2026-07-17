import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  isPlatformAdminHost,
  resolveDeploymentRootHost,
  resolveStoreSubdomain,
  toPlatformAdminHost,
} from '@/lib/utils/store-host'
import { normalizeSafeAdminPath, resolveAdminAccess } from '@/lib/supabase/admin-access'
import { isRouteOrDescendant } from '@/lib/admin/routes'

// Variable de entorno para deshabilitar multi-tenant temporalmente
const DISABLE_SUBDOMAIN_MULTI_TENANT = process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === 'true'
// Store ID por defecto cuando multi-tenant está deshabilitado (puede venir de variable de entorno)
const DEFAULT_STORE_ID = process.env.DEFAULT_STORE_ID || null

// Tipos para la tienda
interface Store {
  id: string
  subdomain: string
  store_name: string
  domain: string
  is_active: boolean
  is_public: boolean
}

// Caché simple en memoria para las tiendas (evita consultas repetidas)
const storeCache = new Map<string, { store: Store | null; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 60 segundos: acota el retraso de publicar/despublicar a 1 min

async function applyAdminRouteGate(request: NextRequest, response: NextResponse) {
  const { pathname, search } = request.nextUrl

  if (!isRouteOrDescendant(pathname, '/admin')) {
    return response
  }

  const access = await resolveAdminAccess(request)
  if (access.status === 'admin') {
    return response
  }

  const redirectUrl = request.nextUrl.clone()
  redirectUrl.pathname = '/'
  redirectUrl.search = ''

  if (access.status === 'guest') {
    const next = normalizeSafeAdminPath(`${pathname}${search}`) || '/admin'
    redirectUrl.searchParams.set('auth', 'login')
    redirectUrl.searchParams.set('next', next)
    return NextResponse.redirect(redirectUrl)
  }

  redirectUrl.searchParams.set(
    'admin_access',
    access.status === 'error' ? 'error' : 'denied',
  )
  return NextResponse.redirect(redirectUrl)
}

// Resuelve la tienda por subdominio con la SERVICE KEY, no la anon key: la RLS de
// stores (is_active AND is_public) esconde las tiendas despublicadas o suspendidas
// a la anon key, por lo que el resolver no podría distinguir "no existe" de
// "existe pero no está live". La service key bypassea la RLS; deleted_at IS NULL
// se mantiene porque una tienda borrada sí es "no encontrada".
async function getStoreBySubdomain(subdomain: string): Promise<Store | null> {
  const cached = storeCache.get(subdomain)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.store
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[Proxy] Supabase no configurado')
      return null
    }

    const params = new URLSearchParams({
      subdomain: `eq.${subdomain}`,
      deleted_at: 'is.null',
      select: 'id,subdomain,store_name,domain,is_active,is_public',
    })
    const response = await fetch(
      `${supabaseUrl}/rest/v1/stores_legacy?${params.toString()}`,
      {
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Accept-Profile': 'ecommerce',
        },
        signal: AbortSignal.timeout(5000),
      }
    )

    if (!response.ok) {
      console.error('[Proxy] Error al obtener tienda:', response.status, response.statusText)
      storeCache.set(subdomain, { store: null, timestamp: Date.now() })
      return null
    }

    const data = await response.json()
    const store: Store | null = Array.isArray(data) && data.length > 0 ? (data[0] as Store) : null

    storeCache.set(subdomain, { store, timestamp: Date.now() })
    return store
  } catch (error) {
    console.error('[Proxy] Error al obtener tienda:', error)
    storeCache.set(subdomain, { store: null, timestamp: Date.now() })
    return null
  }
}

// is_active = suspensión del operador; is_public = bandera de publicación del dueño.
// Una tienda solo se sirve como storefront si ambas se cumplen.
function isStoreLive(store: Store): boolean {
  return store.is_active && store.is_public
}

// El recorrido con el que un dueño gestiona y publica su tienda vive fuera del
// storefront: /admin (panel), /auth (login, callback, cambio forzado de clave,
// cuenta confirmada) y /dashboard (redirige a /admin). Debe pasar aunque la tienda
// no esté live; si no, el dueño de una tienda despublicada queda atrapado en
// /store-inactive sin poder entrar a publicarla ni cambiar su clave temporal.
const ADMIN_JOURNEY_ROOTS = ['/admin', '/auth', '/dashboard']

function isAdminJourneyPath(pathname: string): boolean {
  return ADMIN_JOURNEY_ROOTS.some(root => isRouteOrDescendant(pathname, root))
}

// ── Host admin (Plan 12, separación de privilegios) ─────────────────────────
// admin.<dominio> sirve SOLO el tier plataforma (D1/D4): la consola de tenants
// con rutas limpias (`/` consola, `/create` alta, `/<uuid>` ficha — su página
// llega en el slice 7) que el proxy reescribe a las páginas existentes bajo
// /admin/stores (A3), más el auth journey, que pasa tal cual. El storefront no
// existe aquí: la rama no emite headers x-store-* ni cookie store_id ni toca el
// caché de tiendas. Plan 13 reescribirá el proxy: mantener esta rama localizada.
const PLATFORM_CONSOLE_BASE = '/admin/stores'
const PLATFORM_LOGIN_PATH = '/auth/login'

// stores.id es un uuid: cualquier otro segmento no es la ficha de un tenant.
const STORE_ID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function resolvePlatformConsolePath(pathname: string): string | null {
  if (pathname === '/') return PLATFORM_CONSOLE_BASE
  if (pathname === '/create') return `${PLATFORM_CONSOLE_BASE}/create`
  if (pathname === '/users') return `${PLATFORM_CONSOLE_BASE}/users`

  const segment = pathname.slice(1)
  return STORE_ID_SEGMENT.test(segment) ? `${PLATFORM_CONSOLE_BASE}/${segment}` : null
}

async function handlePlatformAdminHost(request: NextRequest, hostname: string) {
  const { pathname } = request.nextUrl

  // El auth journey se sirve en este mismo host: la sesión de Supabase es una
  // cookie host-only, así que loguearse en otro host no valdría aquí.
  if (isRouteOrDescendant(pathname, '/auth') || isRouteOrDescendant(pathname, '/dashboard')) {
    return NextResponse.next()
  }

  const consolePath = resolvePlatformConsolePath(pathname)
  if (!consolePath) {
    // D4: cualquier ruta ajena al tier plataforma vuelve a la consola.
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  const access = await resolveAdminAccess(request)

  // El modal de login vive en el header del storefront, que no existe en este
  // host: el guest va al login dedicado del auth journey.
  if (access.status === 'guest') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = PLATFORM_LOGIN_PATH
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  // non_admin/error: aquí `/` es la propia consola gateada — redirigir ahí sería
  // un loop. Sin membresía no se puede resolver "su" tienda, así que sale al
  // host raíz del despliegue con el mismo feedback que dan los hosts de tienda.
  if (access.status !== 'admin') {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.host = resolveDeploymentRootHost(hostname)
    redirectUrl.pathname = '/'
    redirectUrl.search = ''
    redirectUrl.searchParams.set('admin_access', access.status === 'error' ? 'error' : 'denied')
    return NextResponse.redirect(redirectUrl)
  }

  // El proxy solo enruta: no distingue super_admin (resolveAdminAccess no lo
  // sabe); authorizeSuperAdmin en las páginas decide el acceso real.
  const rewriteUrl = request.nextUrl.clone()
  rewriteUrl.pathname = consolePath
  return NextResponse.rewrite(rewriteUrl)
}
// ── Fin del host admin ──────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Rutas que no requieren verificación de tienda
  const publicPaths = [
    '/api/health',
    '/_next',
    '/favicon.ico',
    '/opengraph-image.png',
  ]

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // ── Host admin (Plan 12): corre antes del flag DISABLE_SUBDOMAIN_MULTI_TENANT
  // a propósito. El flag congela la resolución de tienda del storefront, pero la
  // consola no es un storefront: con el flag activo el host admin sería tratado
  // como la tienda por defecto (headers y cookie de tienda incluidos), justo lo
  // que D4 prohíbe. La rama tampoco consulta tiendas, así que no reintroduce las
  // consultas a BD que el flag evita.

  // Los marcadores viejos de la consola saltan en cualquier host al host admin
  // con su ruta limpia (/admin/stores → /, /admin/stores/create → /create).
  if (isRouteOrDescendant(pathname, PLATFORM_CONSOLE_BASE)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.host = toPlatformAdminHost(hostname)
    redirectUrl.pathname = pathname.slice(PLATFORM_CONSOLE_BASE.length) || '/'
    return NextResponse.redirect(redirectUrl, 301)
  }

  if (isPlatformAdminHost(hostname)) {
    return handlePlatformAdminHost(request, hostname)
  }
  // ── Fin del host admin ──

  // Si multi-tenant está deshabilitado, usar store_id por defecto sin consultar BD
  if (DISABLE_SUBDOMAIN_MULTI_TENANT) {
    const response = NextResponse.next()
    const storeId = DEFAULT_STORE_ID || 'default'
    
    response.headers.set('x-store-id', storeId)
    response.headers.set('x-store-subdomain', 'default')
    response.headers.set('x-store-name', 'Default Store')

    // Agregar cookie para persistir la tienda
    response.cookies.set('store_id', storeId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      sameSite: 'lax',
    })

    return applyAdminRouteGate(request, response)
  }

  // Extraer subdominio
  const subdomain = resolveStoreSubdomain(hostname)

  // Si no hay subdominio, usar tienda por defecto
  if (!subdomain) {
    // Obtener tienda por defecto desde Supabase
    const defaultStore = await getStoreBySubdomain('default')
    
    if (defaultStore && isStoreLive(defaultStore)) {
      // Usar tienda por defecto si existe
      const response = NextResponse.next()
      response.headers.set('x-store-id', defaultStore.id)
      response.headers.set('x-store-subdomain', 'default')
      response.headers.set('x-store-name', defaultStore.store_name)
      
      response.cookies.set('store_id', defaultStore.id, {
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 días
        sameSite: 'lax',
      })
      
      return applyAdminRouteGate(request, response)
    }
    
    // Si no existe tienda por defecto, permitir continuar con valores por defecto
    // (esto permite que la aplicación funcione incluso sin configuración)
    const response = NextResponse.next()
    response.headers.set('x-store-id', 'default')
    response.headers.set('x-store-subdomain', 'default')
    response.headers.set('x-store-name', 'Tienda Principal')
    
    response.cookies.set('store_id', 'default', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      sameSite: 'lax',
    })
    
    return applyAdminRouteGate(request, response)
  }

  // Obtener información de la tienda
  const store = await getStoreBySubdomain(subdomain)

  if (!store) {
    // La tienda no existe (o está borrada): no encontrada
    const url = request.nextUrl.clone()
    url.pathname = '/store-not-found'
    return NextResponse.rewrite(url)
  }

  // Una tienda que existe pero no está live esconde su storefront, pero su dueño
  // debe poder recorrer /admin, /auth y /dashboard para gestionarla, publicarla y
  // cambiar su clave temporal: dejamos pasar ese recorrido (el gate de servidor
  // sigue decidiendo la membresía en /admin) y solo reescribimos el storefront a
  // /store-inactive.
  if (!isStoreLive(store) && !isAdminJourneyPath(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/store-inactive'
    return NextResponse.rewrite(url)
  }

  // Tienda válida, agregar headers para uso en la aplicación
  const response = NextResponse.next()
  response.headers.set('x-store-id', store.id)
  response.headers.set('x-store-subdomain', store.subdomain)
  response.headers.set('x-store-name', store.store_name)

  // Agregar cookie para persistir la tienda (opcional)
  response.cookies.set('store_id', store.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    sameSite: 'lax',
  })

  return applyAdminRouteGate(request, response)
}

// Configurar qué rutas deben ejecutar el proxy
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

