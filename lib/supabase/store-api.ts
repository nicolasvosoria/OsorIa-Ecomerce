import { createServerClient } from "@supabase/ssr"
import { cookies, headers } from "next/headers"

/**
 * Obtiene el cliente de Supabase para el servidor
 */
async function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error("[Supabase] ❌ Variables de entorno no configuradas")
    return null
  }

  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch (error) {
          // Las cookies pueden fallar durante el renderizado estático
        }
      },
    },
  })
}

/**
 * Obtiene el store_id desde headers o cookies
 */
async function getStoreIdFromServer(): Promise<string | null> {
  try {
    const headersList = await headers()
    const storeId = headersList.get('x-store-id')
    if (storeId) return storeId

    const cookieStore = await cookies()
    const storeIdCookie = cookieStore.get('store_id')
    if (storeIdCookie) return storeIdCookie.value
  } catch (error: any) {
    if (error?.message?.includes('prerender') || error?.message?.includes('During prerendering')) {
      return 'default'
    }
    console.warn('[Store API] Error al obtener store_id del servidor:', error)
    return 'default'
  }
  
  return 'default'
}

/**
 * Obtiene información de una tienda desde el servidor
 */
export async function getStoreFromServer(): Promise<{ id: string; subdomain: string; store_name: string; primary_color?: string; secondary_color?: string } | null> {
  try {
    const supabase = await getSupabaseServerClient()
    if (!supabase) {
      return null
    }

    const storeId = await getStoreIdFromServer()
    if (!storeId) {
      console.log('[Store API] No se pudo obtener storeId del servidor')
      return null
    }

    // Si storeId es 'default' (string), buscar por subdomain en lugar de por ID
    const ecommerce = supabase.schema('ecommerce')
    let query = ecommerce
      .from('stores_legacy')
      .select('id, subdomain, store_name, primary_color, secondary_color')
      .eq('is_active', true)
      .is('deleted_at', null)

    if (storeId === 'default') {
      // Buscar por subdomain si el storeId es 'default'
      query = query.eq('subdomain', 'default')
      console.log('[Store API] Buscando tienda por subdomain: default')
    } else {
      // Buscar por ID si es un UUID válido
      query = query.eq('id', storeId)
      console.log('[Store API] Buscando tienda por ID:', storeId)
    }

    const { data, error } = await query.single()

    // Si hay error, verificar qué tipo de error es
    if (error) {
      // Intentar obtener información del error de forma segura
      let errorCode: string | undefined
      let errorMessage: string | undefined
      let errorDetails: any
      let errorHint: string | undefined

      // Verificar si el error tiene propiedades
      if (error && typeof error === 'object') {
        try {
          errorCode = 'code' in error ? String((error as any).code) : undefined
          errorMessage = 'message' in error ? String((error as any).message) : undefined
          errorDetails = 'details' in error ? (error as any).details : undefined
          errorHint = 'hint' in error ? String((error as any).hint) : undefined
        } catch (e) {
          // Si falla al acceder a las propiedades, usar valores por defecto
          errorMessage = String(error)
        }
      } else {
        errorMessage = String(error)
      }

      // Si el error es que no se encontró la tienda (PGRST116), no es crítico
      if (
        errorCode === 'PGRST116' || 
        errorMessage?.includes('No rows') || 
        errorMessage?.includes('not found') ||
        errorMessage?.includes('No rows returned') ||
        errorMessage?.includes('The result contains 0 rows')
      ) {
        console.log(`[Store API] Tienda no encontrada (storeId: ${storeId}), usando configuración por defecto`)
        return null
      }
      
      // Para otros errores, loguear más información de forma segura
      const errorInfo: Record<string, any> = {
        storeId,
        errorType: typeof error,
      }

      if (errorMessage) errorInfo.message = errorMessage
      if (errorCode) errorInfo.code = errorCode
      if (errorDetails) errorInfo.details = errorDetails
      if (errorHint) errorInfo.hint = errorHint

      // Intentar serializar el error completo de forma segura
      try {
        errorInfo.fullError = JSON.stringify(error, (key, value) => {
          // Evitar errores de circular reference
          if (typeof value === 'object' && value !== null) {
            try {
              return value
            } catch {
              return '[Circular]'
            }
          }
          return value
        }, 2)
      } catch (e) {
        errorInfo.fullError = String(error)
      }

      console.error('[Store API] Error al obtener tienda:', errorInfo)
      return null
    }

    // Si no hay datos, retornar null
    if (!data) {
      console.log(`[Store API] No se encontró tienda con storeId: ${storeId}`)
      return null
    }

    return data
  } catch (error: any) {
    if (error?.message?.includes('prerender') || error?.message?.includes('During prerendering')) {
      // Durante el prerenderizado, retornar null y usar default
      return null
    }
    console.error('[Store API] Error inesperado:', {
      message: error?.message,
      stack: error?.stack,
      error,
    })
    return null
  }
}

