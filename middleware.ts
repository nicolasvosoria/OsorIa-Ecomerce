import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware simplificado sin soporte para subdominios
 * Siempre usa la tienda 'default' para el ecommerce principal
 * 
 * NOTA: Esta es una versión temporal para desplegar sin subdominios.
 * Para restaurar el soporte de subdominios, descomentar el código anterior.
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

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

  // Siempre usar la tienda 'default' sin verificar subdominios
  const response = NextResponse.next()
  response.headers.set('x-store-id', 'default')
  response.headers.set('x-store-subdomain', 'default')
  response.headers.set('x-store-name', 'Tienda Principal')

  // Agregar cookie para persistir la tienda
  response.cookies.set('store_id', 'default', {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 días
    sameSite: 'lax',
  })

  return response
}

// Configurar qué rutas deben ejecutar el middleware
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



