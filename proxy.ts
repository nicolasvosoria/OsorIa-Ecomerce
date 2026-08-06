import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  isPlatformAdminHost,
  resolveDeploymentRootHost,
  resolveStoreSubdomain,
  toPlatformAdminHost,
} from '@/lib/utils/store-host'
import {
  normalizeSafeAdminPath,
  requesterManagesStore,
  resolveAdminAccess,
} from '@/lib/supabase/admin-access'
import { ACCEPT_INVITE_PATH } from '@/lib/auth/platform-identity-invites'
import { isInvitedPendingPassword } from '@/lib/auth/invited-session-gate'
import { isThemePreviewSearch } from '@/lib/theme-font/preview-mode'
import { isRouteOrDescendant } from '@/lib/admin/routes'
import {
  NEUTRAL_PAGE_HEADER,
  NEUTRAL_PAGE_KIND,
  UNKNOWN_TENANT_HEADER,
  UNKNOWN_TENANT_VALUE,
} from '@/lib/stores/neutral-page'

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

// ── Headers minteados por el proxy (frontera de confianza) ──────────────────
// x-store-* es identidad que MINTA el proxy a partir de la tienda que resolvió.
// x-osoria-neutral-page y x-osoria-unknown-tenant son los marcadores que el
// propio proxy escribe para /store-inactive y /store-not-found (D3). El
// servidor los lee de los headers de REQUEST (getStoreId, store-api,
// /api/chat, TenantScopedShell), así que cualquiera de ellos enviado a mano
// por el cliente haría que un host renderizara el catálogo o el tema de otro
// tenant, o que un aviso ajeno apagara el chrome del storefront. Por eso se
// borran todos al entrar y solo el proxy vuelve a escribirlos: ninguna página
// ni route handler puede observar un header minteado por el proxy que el
// proxy no haya puesto en esta misma pasada. Los redirects quedan fuera del
// invariante: no renderizan ninguna petición, no hay request que llevar.
const TENANT_IDENTITY_HEADERS = {
  id: 'x-store-id',
  subdomain: 'x-store-subdomain',
  name: 'x-store-name',
} as const

const PROXY_MINTED_HEADERS = [
  ...Object.values(TENANT_IDENTITY_HEADERS),
  NEUTRAL_PAGE_HEADER,
  UNKNOWN_TENANT_HEADER,
]

interface TenantIdentity {
  id: string
  subdomain: string
  name: string
}

function stripInboundProxyMintedHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers)
  PROXY_MINTED_HEADERS.forEach(name => headers.delete(name))
  return headers
}

function applyTenantIdentity(headers: Headers, identity: TenantIdentity): void {
  headers.set(TENANT_IDENTITY_HEADERS.id, identity.id)
  headers.set(TENANT_IDENTITY_HEADERS.subdomain, identity.subdomain)
  headers.set(TENANT_IDENTITY_HEADERS.name, identity.name)
}

function toTenantIdentity(store: Store): TenantIdentity {
  return { id: store.id, subdomain: store.subdomain, name: store.store_name }
}
// ── Fin de los headers minteados por el proxy ───────────────────────────────

// La cookie de tienda se emite sin `domain` a propósito: con un dominio padre el
// navegador la mandaría a todos los subdominios y la tienda de un tenant pisaría
// la del otro. Es la sesión de tienda del visitante, así que sus atributos se
// escriben en un solo sitio.
const TENANT_COOKIE_NAME = 'store_id'
const TENANT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7 // 7 días

function persistTenantCookie(response: NextResponse, storeId: string): void {
  response.cookies.set(TENANT_COOKIE_NAME, storeId, {
    path: '/',
    maxAge: TENANT_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  })
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

// Servir el storefront de un tenant es siempre la misma secuencia. La identidad
// se escribe dos veces porque son dos canales distintos: los headers de REQUEST
// son los que la página lee con headers(), y los de RESPONSE dejan visible en la
// respuesta qué tienda resolvió el proxy.
async function serveTenantStorefront(
  request: NextRequest,
  requestHeaders: Headers,
  identity: TenantIdentity,
) {
  applyTenantIdentity(requestHeaders, identity)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  applyTenantIdentity(response.headers, identity)
  persistTenantCookie(response, identity.id)

  return applyAdminRouteGate(request, response)
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

// El editor de tema (/admin/theme) previsualiza el storefront en un iframe a
// `/?themePreview=1`, así que una tienda todavía sin publicar le mostraría a su
// dueño el aviso de inactiva en vez de lo que está configurando. La vista previa
// atraviesa el aviso, pero solo para quien gestiona ESTA tienda: la puerta es
// can_user_manage_store contra la tienda que resolvió el host, nunca "gestiona
// alguna tienda", que dejaría al dueño de cualquier tenant mirar el catálogo,
// los precios y los borradores pre-lanzamiento de los demás.
// El marcador se mira PRIMERO y corta antes de cualquier await: así el tráfico
// anónimo de una tienda despublicada (visitantes, crawlers, escáneres) no paga
// ni autenticación ni RPC. Y el marcador solo por sí mismo no abre nada: va en
// la query string, cualquiera puede escribirlo, la autoridad la da la sesión.
async function isThemePreviewByStoreManager(
  request: NextRequest,
  storeId: string,
): Promise<boolean> {
  if (!isThemePreviewSearch(request.nextUrl.searchParams)) {
    return false
  }

  return requesterManagesStore(request, storeId)
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

async function handlePlatformAdminHost(
  request: NextRequest,
  hostname: string,
  requestHeaders: Headers,
) {
  const { pathname } = request.nextUrl

  // El auth journey se sirve en este mismo host: la sesión de Supabase es una
  // cookie host-only, así que loguearse en otro host no valdría aquí.
  if (isRouteOrDescendant(pathname, '/auth') || isRouteOrDescendant(pathname, '/dashboard')) {
    return NextResponse.next({ request: { headers: requestHeaders } })
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
  return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
}
// ── Fin del host admin ──────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const requestHeaders = stripInboundProxyMintedHeaders(request)

  // Rutas que no requieren verificación de tienda
  const publicPaths = [
    '/api/health',
    '/_next',
    '/favicon.ico',
    '/opengraph-image.png',
  ]

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // D22: la restricción global de la sesión recién invitada corre antes que
  // CUALQUIER otra rama (host admin, storefront de tenant) para que aplique
  // sin importar en qué host esté navegando -- "cada ruta", no solo /admin.
  // Se salta únicamente su propio destino permitido; todo lo demás
  // (incluido cerrar sesión, que es una llamada del SDK a GoTrue, nunca una
  // ruta de esta app) vive dentro de esa misma página.
  if (pathname !== ACCEPT_INVITE_PATH && (await isInvitedPendingPassword(request))) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = ACCEPT_INVITE_PATH
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
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
    return handlePlatformAdminHost(request, hostname, requestHeaders)
  }
  // ── Fin del host admin ──

  // Si multi-tenant está deshabilitado, usar store_id por defecto sin consultar BD
  if (DISABLE_SUBDOMAIN_MULTI_TENANT) {
    return serveTenantStorefront(request, requestHeaders, {
      id: DEFAULT_STORE_ID || 'default',
      subdomain: 'default',
      name: 'Default Store',
    })
  }

  // Extraer subdominio
  const subdomain = resolveStoreSubdomain(hostname)

  // Si no hay subdominio, usar tienda por defecto
  if (!subdomain) {
    // Obtener tienda por defecto desde Supabase
    const defaultStore = await getStoreBySubdomain('default')
    
    if (defaultStore && isStoreLive(defaultStore)) {
      // Usar tienda por defecto si existe
      return serveTenantStorefront(request, requestHeaders, {
        id: defaultStore.id,
        subdomain: 'default',
        name: defaultStore.store_name,
      })
    }

    // Si no existe tienda por defecto, permitir continuar con valores por defecto
    // (esto permite que la aplicación funcione incluso sin configuración)
    return serveTenantStorefront(request, requestHeaders, {
      id: 'default',
      subdomain: 'default',
      name: 'Tienda Principal',
    })
  }

  // Obtener información de la tienda
  const store = await getStoreBySubdomain(subdomain)

  if (!store) {
    // La tienda no existe (o está borrada): no encontrada. Sin tienda no hay
    // identidad que propagar, así que marcamos el tenant como desconocido: si el
    // aviso se renderizara sin señal, getStoreId() lo resolvería como la tienda
    // `default` y el aviso saldría vestido de otro tenant.
    const url = request.nextUrl.clone()
    url.pathname = '/store-not-found'
    requestHeaders.set(UNKNOWN_TENANT_HEADER, UNKNOWN_TENANT_VALUE)
    requestHeaders.set(NEUTRAL_PAGE_HEADER, NEUTRAL_PAGE_KIND.storeNotFound)
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  }

  // Una tienda que existe pero no está live esconde su storefront, pero su dueño
  // debe poder recorrer /admin, /auth y /dashboard para gestionarla, publicarla y
  // cambiar su clave temporal: dejamos pasar ese recorrido (el gate de servidor
  // sigue decidiendo la membresía en /admin) y solo reescribimos el storefront a
  // /store-inactive.
  const hidesStorefront =
    !isStoreLive(store) &&
    !isAdminJourneyPath(pathname) &&
    !(await isThemePreviewByStoreManager(request, store.id))

  if (hidesStorefront) {
    const url = request.nextUrl.clone()
    url.pathname = '/store-inactive'
    // La identidad viaja como headers de REQUEST, no de response: la página que
    // renderiza el aviso los lee con headers(), y en una reescritura solo llegan
    // los que se pasan en el segundo argumento.
    applyTenantIdentity(requestHeaders, toTenantIdentity(store))
    requestHeaders.set(NEUTRAL_PAGE_HEADER, NEUTRAL_PAGE_KIND.storeInactive)

    const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    persistTenantCookie(response, store.id)
    return response
  }

  return serveTenantStorefront(request, requestHeaders, toTenantIdentity(store))
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

