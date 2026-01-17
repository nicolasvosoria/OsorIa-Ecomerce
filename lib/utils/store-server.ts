/**
 * Funciones para obtener store_id en el SERVIDOR
 * Solo debe usarse en Server Components o Server Actions
 */

/**
 * Obtiene el store_id del servidor usando headers y cookies de Next.js
 * SOLO funciona en Server Components o Server Actions
 */
export async function getStoreIdServer(): Promise<string | null> {
  // Si multi-tenant está deshabilitado, retornar store_id por defecto
  const disableMultiTenant = process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === 'true'
  if (disableMultiTenant) {
    return process.env.DEFAULT_STORE_ID || 'default'
  }

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









