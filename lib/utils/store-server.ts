/**
 * Funciones para obtener store_id en el SERVIDOR
 * Solo debe usarse en Server Components o Server Actions
 */

/**
 * Obtiene el store_id del servidor usando headers y cookies de Next.js
 * SOLO funciona en Server Components o Server Actions
 */
export async function getStoreIdServer(): Promise<string | null> {
  // Importación dinámica para evitar errores en el cliente
  const { cookies, headers } = await import('next/headers')
  
  try {
    // En Next.js 15+, headers() retorna una Promise
    const headersList = await headers()
    const storeId = headersList.get('x-store-id')
    if (storeId) return storeId

    // Fallback: obtener de cookies
    const cookieStore = await cookies()
    const storeIdCookie = cookieStore.get('store_id')
    if (storeIdCookie) return storeIdCookie.value
  } catch (error: any) {
    // Si hay error (por ejemplo, durante prerendering o build time), usar default
    if (error?.message?.includes('prerender') || error?.message?.includes('During prerendering')) {
      return 'default'
    }
    console.warn('[Store] Error al obtener store_id del servidor:', error)
    return 'default'
  }

  return 'default'
}








