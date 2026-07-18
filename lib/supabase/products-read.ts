import { getSupabaseEcommerce } from './client'
import { ECOMMERCE_TABLES, ECOMMERCE_VIEWS } from './contract'
import type {
  StoreItemWithDetails,
  ItemCategory,
  ItemVariant,
  ItemImage,
  ItemOption,
  GetItemsParams,
  GetItemsResult,
} from '@/lib/types/products'
import {
  comboToStoreItem,
  getComboById,
  getComboStock as getDerivedComboStock,
  listCombos,
} from './combos-api'
import { isDefaultStoreAlias, resolveDefaultStoreId } from './store-alias'
import { sanitizeIlikeSearchTerm } from '@/lib/security/postgrest-search'
import { getStoreId } from '@/lib/utils/store'
import { withTimeout } from './with-timeout'
import { STORE_ITEMS_SELECT, comboItemsMatching, mapStoreItemRow, sortStoreItems } from './store-items-query'

export type { GetItemsParams, GetItemsResult }

interface StorefrontReadParams {
  categoryId?: string
  search?: string
  orderBy: NonNullable<GetItemsParams['order_by']>
  orderDirection: NonNullable<GetItemsParams['order_direction']>
  limit: number
}

// Lectura acotada al store del host actual: NO acepta un store_id externo, así que
// no puede leer otra tienda. La lectura masiva con override vive en products-api (server-only).
async function readStorefrontItems(params: StorefrontReadParams): Promise<StoreItemWithDetails[]> {
  const supabase = getSupabaseEcommerce()
  if (!supabase) return []

  let storeId = await getStoreId()
  if (isDefaultStoreAlias(storeId)) {
    storeId = await resolveDefaultStoreId(supabase, 'readStorefrontItems')
    if (!storeId) return []
  }

  const { categoryId, search, orderBy, orderDirection, limit } = params

  let query = supabase
    .from(ECOMMERCE_VIEWS.storeItemsLegacy)
    .select(STORE_ITEMS_SELECT)
    .eq('store_id', storeId)
    .eq('is_active', true)
    .eq('is_available_for_sale', true)

  if (categoryId) {
    query = query.eq('category_id', categoryId)
  }

  const sanitizedSearch = sanitizeIlikeSearchTerm(search)
  if (sanitizedSearch) {
    query = query.or(
      `item_name.ilike.%${sanitizedSearch}%,item_description.ilike.%${sanitizedSearch}%,item_code.ilike.%${sanitizedSearch}%`,
    )
  }

  query = query.order(orderBy, { ascending: orderDirection === 'asc' }).range(0, limit - 1)

  const result = await withTimeout(query, 20000, 'readStorefrontItems') as { data: any; error: any }
  if (result.error) {
    console.error('[Products] Error al leer productos de la tienda:', result.error)
    return []
  }

  const productItems = ((result.data as any[]) || []).map(mapStoreItemRow)

  const combos = await listCombos({ store_id: storeId, category_id: categoryId })
  const comboItems = comboItemsMatching(combos, { search })

  return sortStoreItems([...productItems, ...comboItems], orderBy, orderDirection)
}

/**
 * Buscar productos por término de búsqueda
 */
export async function searchItems(searchTerm: string, limit: number = 20): Promise<StoreItemWithDetails[]> {
  return readStorefrontItems({
    search: searchTerm,
    limit,
    orderBy: 'created_at',
    orderDirection: 'desc',
  })
}

/**
 * Obtener productos por categoría
 */
export async function getItemsByCategory(categoryId: string, limit: number = 20): Promise<StoreItemWithDetails[]> {
  return readStorefrontItems({
    categoryId,
    limit,
    orderBy: 'display_order',
    orderDirection: 'asc',
  })
}

/**
 * Obtener un producto por ID
 */
export async function getItemById(
  itemId: string,
  storeId?: string,
  supabaseOverride?: any,
): Promise<StoreItemWithDetails | null> {
  try {
    const supabase = supabaseOverride ?? getSupabaseEcommerce()
    if (!supabase) {
      return null
    }

    // Obtener store_id si no se proporciona
    let currentStoreId = storeId || await getStoreId()

    // Si no hay store_id (por ejemplo, durante build time), intentar obtener el UUID de la tienda por defecto
    if (isDefaultStoreAlias(currentStoreId)) {
      currentStoreId = await resolveDefaultStoreId(supabase, 'getItemById')
      if (!currentStoreId) return null
    }

    const result = await withTimeout(
      supabase
        .from(ECOMMERCE_VIEWS.storeItemsLegacy)
        .select(STORE_ITEMS_SELECT)
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
      const comboFallback = await getComboById(itemId)
      return comboFallback ? comboToStoreItem(comboFallback) : null
    }

    if (!itemData) {
      console.log(`[Products] No se encontró producto con ID: "${itemId}"`)
      const comboFallback = await getComboById(itemId)
      return comboFallback ? comboToStoreItem(comboFallback) : null
    }

    const item = itemData as any

    // Obtener variantes, imágenes y opciones (similar a getItemBySlug)
    const [variantsResult, imagesResult, optionsResult] = await Promise.all([
      supabase.from(ECOMMERCE_TABLES.itemVariants).select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      supabase.from(ECOMMERCE_TABLES.itemImages).select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
      supabase.from(ECOMMERCE_VIEWS.itemOptionsLegacy).select('*').eq('item_id', item.id).order('display_order', { ascending: true }),
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
 * Obtener stock disponible de un producto
 * Retorna null si el producto no rastrea inventario o no existe
 */
export async function getProductStock(productId: string): Promise<number | null> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return null
    }

    const result = await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.storeItems)
        .select('track_inventory, inventory_quantity, is_available_for_sale, is_active')
        .eq('id', productId)
        .single(),
      10000,
      'getProductStock'
    ) as { data: any; error: any }

    if (result.error || !result.data) {
      return getDerivedComboStock(productId)
    }

    const product = result.data

    // Si no rastrea inventario, retornar null (stock ilimitado)
    if (!product.track_inventory) {
      return null
    }

    // Si no está disponible, retornar 0
    if (!product.is_available_for_sale || !product.is_active) {
      return 0
    }

    return product.inventory_quantity || 0
  } catch (error: any) {
    console.error('[Products] Error al obtener stock del producto:', error)
    return null
  }
}

/**
 * Obtener stock disponible de una variante
 * Retorna null si la variante no rastrea inventario o no existe
 */
export async function getVariantStock(variantId: string): Promise<number | null> {
  try {
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return null
    }

    const result = await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.itemVariants)
        .select('track_inventory, inventory_quantity, is_available')
        .eq('id', variantId)
        .single(),
      10000,
      'getVariantStock'
    ) as { data: any; error: any }

    if (result.error || !result.data) {
      return null
    }

    const variant = result.data

    // Si no rastrea inventario, retornar null (stock ilimitado)
    if (!variant.track_inventory) {
      return null
    }

    // Si no está disponible, retornar 0
    if (!variant.is_available) {
      return 0
    }

    return variant.inventory_quantity || 0
  } catch (error: any) {
    console.error('[Products] Error al obtener stock de la variante:', error)
    return null
  }
}
