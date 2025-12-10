/**
 * Obtiene la URL base de la aplicación
 * Funciona tanto en desarrollo como en producción (Vercel)
 */
export function getBaseUrl(): string {
  // En el cliente, usar window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // En el servidor, usar variables de entorno
  // NEXT_PUBLIC_SITE_URL tiene prioridad si está definida
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // En Vercel, usar VERCEL_URL con protocolo https
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Fallback para desarrollo local
  return process.env.NEXT_PUBLIC_VERCEL_URL || 'http://localhost:3000'
}

/**
 * Obtiene la URL completa para una ruta específica
 */
export function getUrl(path: string): string {
  const baseUrl = getBaseUrl()
  // Asegurar que path comience con /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}

