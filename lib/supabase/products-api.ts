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
export async function getCategories(includeInactive: boolean = false): Promise<ItemCategory[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Products] Supabase no configurado')
      return []
    }

    let query = supabase.from('item_categories').select('*').order('display_order', { ascending: true })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await withTimeout(query, 15000, 'getCategories')

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

    const { data, error } = await withTimeout(
      supabase.from('item_categories').select('*').eq('id', categoryId).single(),
      15000,
      'getCategoryById'
    )

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

    let query = supabase
      .from('store_items')
      .select('*, item_categories(*)', { count: 'exact' })
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

    const { data, error, count } = await withTimeout(query, 20000, 'getItems')

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
export async function getItemBySlug(slug: string): Promise<StoreItemWithDetails | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    // Obtener el producto con su categoría
    const { data: itemData, error: itemError } = await withTimeout(
      supabase.from('store_items').select('*, item_categories(*)').eq('item_slug', slug).single(),
      15000,
      'getItemBySlug'
    )

    if (itemError || !itemData) {
      console.error('[Products] Error al obtener producto:', itemError)
      return null
    }

    const item = itemData as any

    // Obtener variantes
    const { data: variantsData } = await withTimeout(
      supabase.from('item_variants').select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      15000,
      'getItemVariants'
    )

    // Obtener imágenes
    const { data: imagesData } = await withTimeout(
      supabase
        .from('item_images')
        .select('*')
        .or(`item_id.eq.${item.id},variant_id.in.(${(variantsData || []).map((v: any) => v.id).join(',')})`)
        .order('display_order', { ascending: true }),
      15000,
      'getItemImages'
    )

    // Obtener opciones
    const { data: optionsData } = await withTimeout(
      supabase.from('item_options').select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      15000,
      'getItemOptions'
    )

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
export async function getItemById(itemId: string): Promise<StoreItemWithDetails | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    const { data: itemData, error: itemError } = await withTimeout(
      supabase.from('store_items').select('*, item_categories(*)').eq('id', itemId).single(),
      15000,
      'getItemById'
    )

    if (itemError || !itemData) {
      console.error('[Products] Error al obtener producto:', itemError)
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

    const { error } = await withTimeout(
      supabase.rpc('increment_item_views', { item_id: itemId }),
      10000,
      'incrementItemViewCount'
    )

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





