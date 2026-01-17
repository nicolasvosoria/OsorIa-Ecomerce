import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

/**
 * Extrae el subdominio de la URL
 */
function getSubdomain(hostname: string): string | null {
  // En desarrollo local, detectar subdominios como reposteria.localhost
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // Si es localhost con subdominio (ej: reposteria.localhost)
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
      return parts[0] // Retornar el subdominio (ej: 'reposteria')
    }
    // Si es solo localhost sin subdominio, usar 'default'
    return 'default'
  }

  // En Vercel, los dominios pueden ser:
  // - tudominio.com (sin subdominio)
  // - subdominio.tudominio.com (con subdominio)
  // - proyecto.vercel.app (dominio de Vercel sin subdominio - 3 partes)
  // - subdominio.proyecto.vercel.app (subdominio en Vercel - 4 partes)
  
  const parts = hostname.split('.')
  
  // Detectar dominios de Vercel: tienen 'vercel.app' al final
  const isVercelDomain = parts.length >= 2 && 
    (parts[parts.length - 2] === 'vercel' && parts[parts.length - 1] === 'app')
  
  if (isVercelDomain) {
    // Si tiene exactamente 3 partes (proyecto.vercel.app), no hay subdominio real
    if (parts.length === 3) {
      return null // Se manejará como 'default' más abajo
    }
    // Si tiene 4 o más partes (subdominio.proyecto.vercel.app), hay subdominio real
    if (parts.length >= 4) {
      return parts[0] // Retornar el subdominio (ej: 'reposteria')
    }
  }
  
  // Para dominios personalizados o otros casos
  if (parts.length >= 2) {
    const subdomain = parts[0]
    
    // Ignorar 'www'
    if (subdomain === 'www') {
      return parts.length > 2 ? parts[1] : null
    }
    
    // Si es un dominio de 2 partes (ej: tudominio.com), no hay subdominio
    if (parts.length === 2) {
      return null
    }
    
    // Si tiene 3 o más partes (subdominio.tudominio.com), retornar el subdominio
    return subdomain
  }
  
  return null
}

/**
 * Obtiene la tienda desde Supabase por subdominio
 */
async function getStoreBySubdomain(subdomain: string): Promise<Store | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Proxy] Supabase no configurado')
      return null
    }

    // Llamar a la función de Supabase
    const response = await fetch(
      `${supabaseUrl}/rest/v1/rpc/get_store_by_subdomain?p_subdomain=${encodeURIComponent(subdomain)}`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error('[Proxy] Error al obtener tienda:', response.statusText)
      return null
    }

    const data = await response.json()
    
    if (data && data.length > 0) {
      return data[0] as Store
    }

    return null
  } catch (error) {
    console.error('[Proxy] Error al obtener tienda:', error)
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
  const subdomain = getSubdomain(hostname)

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


