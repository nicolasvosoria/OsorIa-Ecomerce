import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { resolveStoreSubdomain } from '@/lib/utils/store-host'

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
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Obtiene la tienda desde Supabase por subdominio (schema ecommerce, vista stores_legacy)
 */
async function getStoreBySubdomain(subdomain: string): Promise<Store | null> {
  const cached = storeCache.get(subdomain)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.store
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Proxy] Supabase no configurado')
      return null
    }

    const params = new URLSearchParams({
      subdomain: `eq.${subdomain}`,
      is_active: 'eq.true',
      deleted_at: 'is.null',
      select: 'id,subdomain,store_name,domain,is_active,is_public',
    })
    const response = await fetch(
      `${supabaseUrl}/rest/v1/stores_legacy?${params.toString()}`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
          'Accept-Profile': 'ecommerce',
          'Prefer': 'return=representation',
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

    return response
  }

  // Extraer subdominio
  const subdomain = resolveStoreSubdomain(hostname)

  // Si no hay subdominio, usar tienda por defecto
  if (!subdomain) {
    // Obtener tienda por defecto desde Supabase
    const defaultStore = await getStoreBySubdomain('default')
    
    if (defaultStore && defaultStore.is_active) {
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
      
      return response
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
    
    return response
  }

  // Obtener información de la tienda
  const store = await getStoreBySubdomain(subdomain)

  if (!store) {
    // Tienda no encontrada
    const url = request.nextUrl.clone()
    url.pathname = '/store-not-found'
    return NextResponse.rewrite(url)
  }

  if (!store.is_active) {
    // Tienda inactiva
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

  return response
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

