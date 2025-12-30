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

      // Si no hay store_id, usar 'default' o obtener del subdominio
      if (!storeId) {
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
      } else {
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
    loadStore()
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

  const parts = hostname.split('.')
  
  if (parts.length >= 2) {
    const subdomain = parts[0]
    if (subdomain === 'www') {
      return parts.length > 2 ? parts[1] : null
    }
    return subdomain
  }
  
  return null
}



