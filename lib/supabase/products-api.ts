import { getSupabaseBrowserClient } from './client'
import type {
  StoreItem,
  StoreItemWithDetails,
  ItemCategory,
  ItemVariant,
  ItemImage,
  ItemOption,
  GetItemsParams,
  GetItemsResult,
} from '@/lib/types/products'

// Importación dinámica de getStoreId para evitar problemas con análisis estático de Next.js
async function getStoreId(): Promise<string | null> {
  const { getStoreId: getStoreIdFn } = await import('@/lib/utils/store')
  return getStoreIdFn()
}

// Re-exportar GetItemsParams para uso externo
export type { GetItemsParams, GetItemsResult }

// Helper para manejar timeouts
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  operation: string = 'operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms en ${operation}`)), timeoutMs)
    ),
  ])
}

/**
 * Obtener todas las categorías activas
 */
export async function getCategories(includeInactive: boolean = false, storeId?: string): Promise<ItemCategory[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Products] Supabase no configurado')
      return []
    }

    // Obtener store_id si no se proporciona
    let currentStoreId = storeId || await getStoreId()
    
    // Si no hay store_id (por ejemplo, durante build time), intentar obtener el UUID de la tienda por defecto
    if (!currentStoreId) {
      try {
        const { data: defaultStore } = await supabase
          .from('stores')
          .select('id')
          .eq('subdomain', 'default')
          .eq('is_active', true)
          .is('deleted_at', null)
          .single()
        
        if (defaultStore?.id) {
          currentStoreId = defaultStore.id
        } else {
          console.warn('[Products] No se pudo obtener store_id para getCategories y no hay tienda por defecto')
          return []
        }
      } catch (error) {
        console.warn('[Products] No se pudo obtener store_id para getCategories:', error)
        return []
      }
    }

    let query = supabase
      .from('item_categories')
      .select('*')
      .eq('store_id', currentStoreId) // Filtrar por tienda
      .order('display_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const result = await withTimeout(query, 15000, 'getCategories') as { data: any; error: any }
    const { data, error } = result

    if (error) {
      console.error('[Products] Error al obtener categorías:', error)
      return []
    }

    return (data as ItemCategory[]) || []
  } catch (error: any) {
    console.error('[Products] Error inesperado al obtener categorías:', error)
    return []
  }
}

/**
 * Obtener una categoría por ID
 */
export async function getCategoryById(categoryId: string): Promise<ItemCategory | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    const result = await withTimeout(
      supabase.from('item_categories').select('*').eq('id', categoryId).single(),
      15000,
      'getCategoryById'
    ) as { data: any; error: any }
    const { data, error } = result

    if (error) {
      console.error('[Products] Error al obtener categoría:', error)
      return null
    }

    return (data as ItemCategory) || null
  } catch (error: any) {
    console.error('[Products] Error inesperado:', error)
    return null
  }
}

/**
 * Obtener productos con filtros y paginación
 */
export async function getItems(params: GetItemsParams = {}): Promise<GetItemsResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return { items: [], total: 0, has_more: false }
    }

    const {
      store_id,
      category_id,
      is_active = true,
      is_featured,
      is_available_for_sale = true,
      search,
      tags,
      limit = 20,
      offset = 0,
      order_by = 'display_order',
      order_direction = 'asc',
    } = params

    // Obtener store_id si no se proporciona en params
    let currentStoreId = store_id || await getStoreId()
    
    // Si no hay store_id (por ejemplo, durante build time), intentar obtener el UUID de la tienda por defecto
    if (!currentStoreId) {
      try {
        const { data: defaultStore } = await supabase
          .from('stores')
          .select('id')
          .eq('subdomain', 'default')
          .eq('is_active', true)
          .is('deleted_at', null)
          .single()
        
        if (defaultStore?.id) {
          currentStoreId = defaultStore.id
        } else {
          // Si no hay tienda por defecto, retornar vacío
          console.warn('[Products] No se pudo obtener store_id y no hay tienda por defecto')
          return { items: [], total: 0, has_more: false }
        }
      } catch (error) {
        // Si falla, retornar vacío
        console.warn('[Products] No se pudo obtener store_id:', error)
        return { items: [], total: 0, has_more: false }
      }
    }

    let query = supabase
      .from('store_items')
      .select('*, item_categories(*)', { count: 'exact' })
      .eq('store_id', currentStoreId) // Filtrar por tienda
      .eq('is_active', is_active)
      .eq('is_available_for_sale', is_available_for_sale)

    // Filtros opcionales
    if (category_id) {
      query = query.eq('category_id', category_id)
    }

    if (is_featured !== undefined) {
      query = query.eq('is_featured', is_featured)
    }

    if (search) {
      query = query.or(`item_name.ilike.%${search}%,item_description.ilike.%${search}%,item_code.ilike.%${search}%`)
    }

    if (tags && tags.length > 0) {
      query = query.contains('tags', tags)
    }

    // Ordenamiento
    query = query.order(order_by, { ascending: order_direction === 'asc' })

    // Paginación
    query = query.range(offset, offset + limit - 1)

    const result = await withTimeout(query, 20000, 'getItems') as { data: any; error: any; count: number | null }
    const { data, error, count } = result

    if (error) {
      console.error('[Products] Error al obtener productos:', error)
      return { items: [], total: 0, has_more: false }
    }

    const items = (data as any[]) || []
    const total = count || 0
    const has_more = offset + limit < total

    // Transformar datos para incluir categoría
    const itemsWithDetails: StoreItemWithDetails[] = items.map((item: any) => ({
      ...item,
      category: item.item_categories ? (item.item_categories as ItemCategory) : undefined,
    }))

    return {
      items: itemsWithDetails,
      total,
      has_more,
    }
  } catch (error: any) {
    console.error('[Products] Error inesperado al obtener productos:', error)
    return { items: [], total: 0, has_more: false }
  }
}

/**
 * Obtener un producto por slug (URL amigable)
 */
export async function getItemBySlug(slug: string, storeId?: string): Promise<StoreItemWithDetails | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    // Obtener store_id si no se proporciona
    let currentStoreId = storeId || await getStoreId()
    
    // Si no hay store_id (por ejemplo, durante build time), intentar obtener el UUID de la tienda por defecto
    if (!currentStoreId) {
      try {
        const { data: defaultStore } = await supabase
          .from('stores')
          .select('id')
          .eq('subdomain', 'default')
          .eq('is_active', true)
          .is('deleted_at', null)
          .single()
        
        if (defaultStore?.id) {
          currentStoreId = defaultStore.id
        } else {
          console.warn('[Products] No se pudo obtener store_id para getItemBySlug y no hay tienda por defecto')
          return null
        }
      } catch (error) {
        console.warn('[Products] No se pudo obtener store_id para getItemBySlug:', error)
        return null
      }
    }

    // Obtener el producto con su categoría, filtrando por tienda
    const result = await withTimeout(
      supabase
        .from('store_items')
        .select('*, item_categories(*)')
        .eq('item_slug', slug)
        .eq('store_id', currentStoreId) // Filtrar por tienda
        .single(),
      15000,
      'getItemBySlug'
    ) as { data: any; error: any }
    const { data: itemData, error: itemError } = result

    // Verificar si hay un error real (con propiedades) o si no se encontró el producto
    if (itemError) {
      // Verificar si el error tiene información útil
      const hasErrorInfo = itemError && typeof itemError === 'object' && Object.keys(itemError).length > 0
      if (hasErrorInfo) {
        console.error('[Products] Error al obtener producto:', {
          message: itemError.message || 'Error desconocido',
          code: itemError.code,
          details: itemError.details,
          hint: itemError.hint,
          slug,
        })
      } else {
        // Si el error está vacío, probablemente el producto no existe
        console.log(`[Products] Producto no encontrado con slug: "${slug}"`)
      }
      return null
    }

    if (!itemData) {
      console.log(`[Products] No se encontró producto con slug: "${slug}"`)
      return null
    }

    const item = itemData as any

    // Obtener variantes
    const variantsResult = await withTimeout(
      supabase.from('item_variants').select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      15000,
      'getItemVariants'
    ) as { data: any; error: any }
    const { data: variantsData } = variantsResult

    // Obtener imágenes
    const imagesResult = await withTimeout(
      supabase
        .from('item_images')
        .select('*')
        .or(`item_id.eq.${item.id},variant_id.in.(${(variantsData || []).map((v: any) => v.id).join(',')})`)
        .order('display_order', { ascending: true }),
      15000,
      'getItemImages'
    ) as { data: any; error: any }
    const { data: imagesData } = imagesResult

    // Obtener opciones
    const optionsResult = await withTimeout(
      supabase.from('item_options').select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      15000,
      'getItemOptions'
    ) as { data: any; error: any }
    const { data: optionsData } = optionsResult

    return {
      ...item,
      category: item.item_categories ? (item.item_categories as ItemCategory) : undefined,
      variants: (variantsData as ItemVariant[]) || [],
      images: (imagesData as ItemImage[]) || [],
      options: (optionsData as ItemOption[]) || [],
    } as StoreItemWithDetails
  } catch (error: any) {
    console.error('[Products] Error inesperado al obtener producto:', error)
    return null
  }
}

/**
 * Obtener un producto por ID
 */
export async function getItemById(itemId: string, storeId?: string): Promise<StoreItemWithDetails | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    // Obtener store_id si no se proporciona
    let currentStoreId = storeId || await getStoreId()
    
    // Si no hay store_id (por ejemplo, durante build time), intentar obtener el UUID de la tienda por defecto
    if (!currentStoreId) {
      try {
        const { data: defaultStore } = await supabase
          .from('stores')
          .select('id')
          .eq('subdomain', 'default')
          .eq('is_active', true)
          .is('deleted_at', null)
          .single()
        
        if (defaultStore?.id) {
          currentStoreId = defaultStore.id
        } else {
          console.warn('[Products] No se pudo obtener store_id para getItemById y no hay tienda por defecto')
          return null
        }
      } catch (error) {
        console.warn('[Products] No se pudo obtener store_id para getItemById:', error)
        return null
      }
    }

    const result = await withTimeout(
      supabase
        .from('store_items')
        .select('*, item_categories(*)')
        .eq('id', itemId)
        .eq('store_id', currentStoreId) // Filtrar por tienda
        .single(),
      15000,
      'getItemById'
    ) as { data: any; error: any }
    const { data: itemData, error: itemError } = result

    // Verificar si hay un error real (con propiedades) o si no se encontró el producto
    if (itemError) {
      // Verificar si el error tiene información útil
      const hasErrorInfo = itemError && typeof itemError === 'object' && Object.keys(itemError).length > 0
      if (hasErrorInfo) {
        console.error('[Products] Error al obtener producto por ID:', {
          message: itemError.message || 'Error desconocido',
          code: itemError.code,
          details: itemError.details,
          hint: itemError.hint,
          itemId,
        })
      } else {
        // Si el error está vacío, probablemente el producto no existe
        console.log(`[Products] Producto no encontrado con ID: "${itemId}"`)
      }
      return null
    }

    if (!itemData) {
      console.log(`[Products] No se encontró producto con ID: "${itemId}"`)
      return null
    }

    const item = itemData as any

    // Obtener variantes, imágenes y opciones (similar a getItemBySlug)
    const [variantsResult, imagesResult, optionsResult] = await Promise.all([
      supabase.from('item_variants').select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      supabase.from('item_images').select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      supabase.from('item_options').select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
    ])

    return {
      ...item,
      category: item.item_categories ? (item.item_categories as ItemCategory) : undefined,
      variants: (variantsResult.data as ItemVariant[]) || [],
      images: (imagesResult.data as ItemImage[]) || [],
      options: (optionsResult.data as ItemOption[]) || [],
    } as StoreItemWithDetails
  } catch (error: any) {
    console.error('[Products] Error inesperado al obtener producto:', error)
    return null
  }
}

/**
 * Obtener productos destacados
 */
export async function getFeaturedItems(limit: number = 10): Promise<StoreItemWithDetails[]> {
  const result = await getItems({
    is_featured: true,
    limit,
    order_by: 'display_order',
    order_direction: 'asc',
  })

  return result.items
}

/**
 * Buscar productos por término de búsqueda
 */
export async function searchItems(searchTerm: string, limit: number = 20): Promise<StoreItemWithDetails[]> {
  const result = await getItems({
    search: searchTerm,
    limit,
    order_by: 'created_at',
    order_direction: 'desc',
  })

  return result.items
}

/**
 * Obtener productos por categoría
 */
export async function getItemsByCategory(categoryId: string, limit: number = 20): Promise<StoreItemWithDetails[]> {
  const result = await getItems({
    category_id: categoryId,
    limit,
    order_by: 'display_order',
    order_direction: 'asc',
  })

  return result.items
}

/**
 * Incrementar contador de vistas de un producto
 */
export async function incrementItemViewCount(itemId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return false
    }

    const result = await withTimeout(
      supabase.rpc('increment_item_views', { item_id: itemId }),
      10000,
      'incrementItemViewCount'
    ) as { error: any }
    const { error } = result

    if (error) {
      // Si la función RPC no existe, hacer update manual
      const { data: currentItem } = await supabase.from('store_items').select('view_count').eq('id', itemId).single()

      if (currentItem) {
        const { error: updateError } = await supabase
          .from('store_items')
          .update({ view_count: (currentItem.view_count || 0) + 1 })
          .eq('id', itemId)

        if (updateError) {
          console.error('[Products] Error al incrementar vistas:', updateError)
          return false
        }
      }
    }

    return true
  } catch (error: any) {
    console.error('[Products] Error inesperado al incrementar vistas:', error)
    return false
  }
}





