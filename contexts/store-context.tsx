"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface Store {
  id: string
  subdomain: string
  store_name: string
  domain: string
  is_active: boolean
  is_public: boolean
  logo_url?: string
  primary_color?: string
  secondary_color?: string
  currency_code: string
  metadata?: Record<string, any>
}

interface StoreContextType {
  store: Store | null
  storeId: string | null
  isLoading: boolean
  error: string | null
  refreshStore: () => Promise<void>
}

const StoreContext = createContext<StoreContextType | undefined>(undefined)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStore = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Verificar si multi-tenant está deshabilitado
      const disableMultiTenant = process.env.NEXT_PUBLIC_DISABLE_SUBDOMAIN_MULTI_TENANT === 'true'
      const defaultStoreId = process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || 'default'

      // Obtener store_id del header (establecido por middleware) o cookie
      let storeId: string | null = null

      // En el cliente, obtener de la cookie
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';')
        const storeIdCookie = cookies.find(c => c.trim().startsWith('store_id='))
        if (storeIdCookie) {
          storeId = storeIdCookie.split('=')[1]
        }
      }

      // Si multi-tenant está deshabilitado, usar store_id por defecto
      if (disableMultiTenant) {
        storeId = defaultStoreId
      }

      // Si no hay store_id, usar 'default' o obtener del subdominio
      if (!storeId && !disableMultiTenant) {
        // Obtener subdominio del hostname
        const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
        const subdomain = getSubdomain(hostname) || 'default'
        
        // Llamar a la API para obtener la tienda
        const response = await fetch(`/api/store?subdomain=${encodeURIComponent(subdomain)}`)
        if (response.ok) {
          const storeData = await response.json()
          if (storeData) {
            setStore(storeData)
            setIsLoading(false)
            return
          }
        }
      } else if (storeId) {
        // Obtener tienda por ID
        const response = await fetch(`/api/store?id=${encodeURIComponent(storeId)}`)
        if (response.ok) {
          const storeData = await response.json()
          if (storeData) {
            setStore(storeData)
            setIsLoading(false)
            return
          }
        }
      }

      // Si no se encontró tienda, usar valores por defecto
      setStore({
        id: 'default',
        subdomain: 'default',
        store_name: 'Tienda Principal',
        domain: typeof window !== 'undefined' ? window.location.hostname : '',
        is_active: true,
        is_public: true,
        currency_code: 'COP',
      })
    } catch (err) {
      console.error('[Store] Error al cargar tienda:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      
      // Usar valores por defecto en caso de error
      setStore({
        id: 'default',
        subdomain: 'default',
        store_name: 'Tienda Principal',
        domain: typeof window !== 'undefined' ? window.location.hostname : '',
        is_active: true,
        is_public: true,
        currency_code: 'COP',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Solo cargar en el cliente, no durante prerendering
    if (typeof window !== 'undefined') {
      loadStore()
    } else {
      // Durante SSR, usar valores por defecto
      setStore({
        id: 'default',
        subdomain: 'default',
        store_name: 'Tienda Principal',
        domain: '',
        is_active: true,
        is_public: true,
        currency_code: 'COP',
      })
      setIsLoading(false)
    }
  }, [])

  const refreshStore = async () => {
    await loadStore()
  }

  return (
    <StoreContext.Provider
      value={{
        store,
        storeId: store?.id || null,
        isLoading,
        error,
        refreshStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (context === undefined) {
    throw new Error("useStore debe usarse dentro de un StoreProvider")
  }
  return context
}

/**
 * Helper para extraer subdominio del hostname
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
  // - proyecto.vercel.app (dominio de Vercel sin subdominio - 3 partes)
  // - subdominio.proyecto.vercel.app (subdominio en Vercel - 4 partes)
  // - tudominio.com (sin subdominio)
  // - subdominio.tudominio.com (con subdominio)
  
  const parts = hostname.split('.')
  
  // Detectar dominios de Vercel: tienen 'vercel.app' al final
  const isVercelDomain = parts.length >= 2 && 
    (parts[parts.length - 2] === 'vercel' && parts[parts.length - 1] === 'app')
  
  if (isVercelDomain) {
    // Si tiene exactamente 3 partes (proyecto.vercel.app), no hay subdominio real
    if (parts.length === 3) {
      return null // Se usará 'default'
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



