import { getSupabaseEcommerce } from './client'
import { ECOMMERCE_VIEWS } from './contract'

export function isDefaultStoreAlias(storeId: string | null | undefined): boolean {
  return !storeId || storeId === 'default'
}

export async function resolveDefaultStoreId(supabase: ReturnType<typeof getSupabaseEcommerce>, operation: string): Promise<string | null> {
  if (!supabase) return null

  try {
    const { data: defaultStore } = await supabase
      .from(ECOMMERCE_VIEWS.storesLegacy)
      .select('id')
      .eq('subdomain', 'default')
      .eq('is_active', true)
      .is('deleted_at', null)
      .single()

    if (defaultStore?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Store] Usando tienda por defecto como fallback en ${operation}`)
      }
      return defaultStore.id
    }

    console.warn(`[Store] No se pudo obtener store_id para ${operation} y no hay tienda por defecto`)
    return null
  } catch (error) {
    console.warn(`[Store] No se pudo obtener store_id para ${operation}:`, error)
    return null
  }
}
