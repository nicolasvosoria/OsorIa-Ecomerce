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
export async function getCategories(includeInactive: boolean = false, storeId?: string | null): Promise<ItemCategory[]> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      console.error('[Products] Supabase no configurado')
      return []
    }

    // Obtener store_id si no se proporciona
    // Si storeId es null explícitamente, no llamar a getStoreId() (para evitar problemas con 'use cache')
    let currentStoreId = storeId
    
    if (currentStoreId === undefined) {
      try {
        currentStoreId = await getStoreId()
      } catch (error: any) {
        // Si falla (por ejemplo, en build time o dentro de 'use cache'), usar null
        if (
          error?.message?.includes('cache scope') ||
          error?.message?.includes('prerender') ||
          error?.message?.includes('outside a request scope')
        ) {
          currentStoreId = null
        } else {
          // Si es otro error, intentar continuar
          currentStoreId = null
        }
      }
    }
    
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
    // Si store_id es null explícitamente, no llamar a getStoreId() (para evitar problemas con 'use cache')
    let currentStoreId: string | null = store_id || null
    
    if (currentStoreId === null && store_id === undefined) {
      try {
        currentStoreId = await getStoreId()
      } catch (error: any) {
        // Si falla (por ejemplo, en build time o dentro de 'use cache'), usar null
        if (
          error?.message?.includes('cache scope') ||
          error?.message?.includes('prerender') ||
          error?.message?.includes('outside a request scope')
        ) {
          currentStoreId = null
        } else {
          // Si es otro error, intentar continuar
          currentStoreId = null
        }
      }
    }
    
    // Si no hay store_id, intentar obtenerlo del subdominio (solo en servidor)
    if (!currentStoreId && typeof window === 'undefined') {
      try {
        // Importación dinámica solo en servidor
        const { headers, cookies } = await import('next/headers')
        const { createServerClient } = await import('@supabase/ssr')
        const headersList = await headers()
        const hostname = headersList.get('host') || ''
        
        // Extraer subdominio del hostname
        let subdomain: string | null = null
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
          const parts = hostname.split('.')
          if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
            subdomain = parts[0]
          } else {
            subdomain = 'default'
          }
        } else {
          const parts = hostname.split('.')
          if (parts.length >= 2) {
            const subdomainPart = parts[0]
            if (subdomainPart === 'www') {
              subdomain = parts.length > 2 ? parts[1] : null
            } else {
              subdomain = subdomainPart
            }
          }
        }
        
        if (subdomain) {
          // Usar cliente de servidor para consultar Supabase
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            const cookieStore = await cookies()
            const serverSupabase = createServerClient(supabaseUrl, supabaseKey, {
              cookies: {
                get(name: string) {
                  return cookieStore.get(name)?.value
                },
                set() {
                  // No hacer nada en lectura
                },
                remove() {
                  // No hacer nada en lectura
                },
              },
            })
            
            const { data: store } = await serverSupabase
              .from('stores')
              .select('id')
              .eq('subdomain', subdomain)
              .eq('is_active', true)
              .is('deleted_at', null)
              .single()
            
            if (store?.id) {
              console.log('[Products] Store ID obtenido de subdominio:', subdomain, '->', store.id)
              currentStoreId = store.id
            }
          }
        }
      } catch (error: any) {
        // Si falla al obtener del subdominio, continuar con el fallback
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Products] No se pudo obtener store_id del subdominio:', error?.message)
        }
      }
    }
    
    // Si aún no hay store_id (por ejemplo, durante build time), intentar obtener el UUID de la tienda por defecto
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
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Products] Usando tienda por defecto como fallback')
          }
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
      .eq('store_id', currentStoreId!) // Filtrar por tienda (currentStoreId ya está validado)
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
export async function getItemBySlug(slug: string, storeId?: string | null): Promise<StoreItemWithDetails | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    // Obtener store_id
    // Si storeId es null explícitamente, no llamar a getStoreId() (para evitar problemas con 'use cache')
    // Si storeId es undefined, intentar obtenerlo (pero puede fallar en build time)
    let currentStoreId = storeId
    
    if (currentStoreId === undefined) {
      try {
        // Intentar obtener storeId, pero puede fallar en build time
        currentStoreId = await getStoreId()
      } catch (error: any) {
        // Si falla (por ejemplo, en build time o dentro de 'use cache'), usar null
        if (
          error?.message?.includes('cache scope') ||
          error?.message?.includes('prerender') ||
          error?.message?.includes('outside a request scope')
        ) {
          currentStoreId = null
        } else {
          throw error
        }
      }
    }
    
    // Si no hay store_id, intentar obtenerlo del subdominio (solo en servidor)
    if (!currentStoreId && typeof window === 'undefined') {
      try {
        // Importación dinámica solo en servidor
        const { headers, cookies } = await import('next/headers')
        const { createServerClient } = await import('@supabase/ssr')
        const headersList = await headers()
        const hostname = headersList.get('host') || ''
        
        // Extraer subdominio del hostname
        let subdomain: string | null = null
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
          const parts = hostname.split('.')
          if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
            subdomain = parts[0]
          } else {
            subdomain = 'default'
          }
        } else {
          const parts = hostname.split('.')
          if (parts.length >= 2) {
            const subdomainPart = parts[0]
            if (subdomainPart === 'www') {
              subdomain = parts.length > 2 ? parts[1] : null
            } else {
              subdomain = subdomainPart
            }
          }
        }
        
        if (subdomain) {
          // Usar cliente de servidor para consultar Supabase
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
          const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
          
          if (supabaseUrl && supabaseKey) {
            const cookieStore = await cookies()
            const serverSupabase = createServerClient(supabaseUrl, supabaseKey, {
              cookies: {
                get(name: string) {
                  return cookieStore.get(name)?.value
                },
                set() {
                  // No hacer nada en lectura
                },
                remove() {
                  // No hacer nada en lectura
                },
              },
            })
            
            const { data: store } = await serverSupabase
              .from('stores')
              .select('id')
              .eq('subdomain', subdomain)
              .eq('is_active', true)
              .is('deleted_at', null)
              .single()
            
            if (store?.id) {
              console.log('[Products] Store ID obtenido de subdominio para getItemBySlug:', subdomain, '->', store.id)
              currentStoreId = store.id
            }
          }
        }
      } catch (error: any) {
        // Si falla al obtener del subdominio, continuar con el fallback
        if (process.env.NODE_ENV === 'development') {
          console.warn('[Products] No se pudo obtener store_id del subdominio en getItemBySlug:', error?.message)
        }
      }
    }
    
    // Si aún no hay store_id (por ejemplo, durante build time), intentar obtener el UUID de la tienda por defecto
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
          if (process.env.NODE_ENV === 'development') {
            console.warn('[Products] Usando tienda por defecto como fallback en getItemBySlug')
          }
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
 * Obtener productos relacionados (misma categoría o últimos activos) para mostrar en la ficha del producto
 */
export async function getRelatedItems(
  excludeProductId: string,
  categoryId?: string | null,
  limit: number = 6,
  storeId?: string | null
): Promise<StoreItemWithDetails[]> {
  const fetchLimit = limit + 10
  const result = await getItems({
    store_id: storeId ?? undefined,
    category_id: categoryId ?? undefined,
    limit: fetchLimit,
    order_by: 'display_order',
    order_direction: 'asc',
    is_active: true,
    is_available_for_sale: true,
  })
  const filtered = result.items.filter((item) => item.id !== excludeProductId)
  return filtered.slice(0, limit)
}

/**
 * Crear un nuevo producto
 */
export interface CreateItemData {
  item_code?: string
  item_name: string
  item_description?: string
  item_description_html?: string
  category_id?: string
  base_price: number
  compare_at_price?: number
  currency_code?: string
  is_active?: boolean
  is_featured?: boolean
  is_available_for_sale?: boolean
  track_inventory?: boolean
  inventory_quantity?: number
  low_stock_threshold?: number
  item_slug?: string
  seo_title?: string
  seo_description?: string
  metadata?: Record<string, any>
  tags?: string[]
  primary_image_url?: string
  primary_image_alt?: string
  display_order?: number
  store_id?: string
}

export interface CreateItemResult {
  success: boolean
  error?: string
  item?: StoreItemWithDetails
}

export async function createItem(
  data: CreateItemData,
  additionalImages: string[] = []
): Promise<CreateItemResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    // Validar que solo haya máximo 3 imágenes en total (primary + additional)
    const totalImagesCount = (data.primary_image_url ? 1 : 0) + additionalImages.length
    if (totalImagesCount > 3) {
      return {
        success: false,
        error: 'Solo se permiten máximo 3 imágenes por producto (1 principal + 2 adicionales)',
      }
    }

    // Obtener store_id
    let storeId = data.store_id || await getStoreId()
    
    // Si no hay store_id, obtener el UUID de la tienda por defecto
    if (!storeId) {
      try {
        const { data: defaultStore } = await supabase
          .from('stores')
          .select('id')
          .eq('subdomain', 'default')
          .eq('is_active', true)
          .is('deleted_at', null)
          .single()
        
        if (defaultStore?.id) {
          storeId = defaultStore.id
        } else {
          return {
            success: false,
            error: 'No se pudo obtener el ID de la tienda',
          }
        }
      } catch (error) {
        console.error('[Products] Error al obtener tienda por defecto:', error)
        return {
          success: false,
          error: 'No se pudo obtener el ID de la tienda',
        }
      }
    }

    // Generar slug si no se proporciona
    let slug = data.item_slug
    if (!slug && data.item_name) {
      slug = data.item_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    // Verificar que el slug sea único
    if (slug) {
      const { data: existingItem } = await supabase
        .from('store_items')
        .select('id')
        .eq('item_slug', slug)
        .eq('store_id', storeId)
        .single()

      if (existingItem) {
        // Si el slug ya existe, agregar un número al final
        let counter = 1
        let uniqueSlug = `${slug}-${counter}`
        let exists = true

        while (exists) {
          const { data: checkItem } = await supabase
            .from('store_items')
            .select('id')
            .eq('item_slug', uniqueSlug)
            .eq('store_id', storeId)
            .single()

          if (!checkItem) {
            exists = false
            slug = uniqueSlug
          } else {
            counter++
            uniqueSlug = `${slug}-${counter}`
          }
        }
      }
    }

    // Generar item_description_html automáticamente desde item_description
    // Si hay item_description, envolverlo en <p> para item_description_html
    const description = data.item_description?.trim() || null
    // Convertir saltos de línea en <br> y envolver en <p>
    const descriptionHtml = description 
      ? `<p>${description.replace(/\n/g, '<br>')}</p>` 
      : null

    // Preparar datos del producto
    const itemData: any = {
      item_code: data.item_code || null,
      item_name: data.item_name,
      item_description: description,
      item_description_html: descriptionHtml,
      category_id: data.category_id || null,
      base_price: data.base_price,
      compare_at_price: data.compare_at_price || null,
      currency_code: data.currency_code || 'COP',
      is_active: data.is_active !== undefined ? data.is_active : true,
      is_featured: data.is_featured !== undefined ? data.is_featured : false,
      is_available_for_sale: data.is_available_for_sale !== undefined ? data.is_available_for_sale : true,
      track_inventory: data.track_inventory !== undefined ? data.track_inventory : false,
      inventory_quantity: data.inventory_quantity || 0,
      low_stock_threshold: data.low_stock_threshold || 10,
      item_slug: slug || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      metadata: data.metadata || {},
      tags: data.tags || [],
      primary_image_url: data.primary_image_url || null,
      primary_image_alt: data.primary_image_alt || null,
      display_order: data.display_order || 0,
      store_id: storeId,
    }

    // Crear el producto
    const result = await withTimeout(
      supabase.from('store_items').insert(itemData).select('*, item_categories(*)').single(),
      20000,
      'createItem'
    ) as { data: any; error: any }

    if (result.error) {
      console.error('[Products] Error al crear producto:', result.error)
      return {
        success: false,
        error: result.error.message || 'Error al crear el producto',
      }
    }

    const item = result.data as any

    // Insertar imágenes adicionales en la tabla item_images
    if (additionalImages.length > 0) {
      const imagesToInsert = additionalImages.map((url, index) => ({
        item_id: item.id,
        image_url: url,
        image_alt: `${item.item_name} - Imagen ${index + 2}`, // Alt text for additional images
        display_order: index + 2, // Start from 2 for additional images
        image_type: 'product',
      }))

      const imagesResult = await withTimeout(
        supabase.from('item_images').insert(imagesToInsert),
        15000,
        'insertAdditionalImages'
      ) as { error: any }
      
      const imagesError = imagesResult.error

      if (imagesError) {
        console.error('[Products] Error al insertar imágenes adicionales:', imagesError)
        // No se retorna error fatal, el producto ya fue creado
      }
    }

    return {
      success: true,
      item: {
        ...item,
        category: item.item_categories ? (item.item_categories as ItemCategory) : undefined,
        variants: [],
        images: [], // These will be fetched separately by getItemBySlug
        options: [],
      } as StoreItemWithDetails,
    }
  } catch (error: any) {
    console.error('[Products] Error inesperado al crear producto:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al crear el producto',
    }
  }
}

/**
 * Actualizar un producto existente
 */
export interface UpdateItemData {
  item_code?: string
  item_name?: string
  item_description?: string
  item_description_html?: string
  category_id?: string
  base_price?: number
  compare_at_price?: number
  currency_code?: string
  is_active?: boolean
  is_featured?: boolean
  is_available_for_sale?: boolean
  track_inventory?: boolean
  inventory_quantity?: number
  low_stock_threshold?: number
  item_slug?: string
  seo_title?: string
  seo_description?: string
  metadata?: Record<string, any>
  tags?: string[]
  primary_image_url?: string
  primary_image_alt?: string
  display_order?: number
}

export interface UpdateItemResult {
  success: boolean
  error?: string
  item?: StoreItemWithDetails
}

export async function updateItem(
  itemId: string,
  data: UpdateItemData,
  additionalImages: string[] = []
): Promise<UpdateItemResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    // Validar que solo haya máximo 3 imágenes en total (primary + additional)
    const totalImagesCount = (data.primary_image_url ? 1 : 0) + additionalImages.length
    if (totalImagesCount > 3) {
      return {
        success: false,
        error: 'Solo se permiten máximo 3 imágenes por producto (1 principal + 2 adicionales)',
      }
    }

    // Obtener el producto actual para preservar valores no modificados
    const currentItemResult = await withTimeout(
      supabase.from('store_items').select('*').eq('id', itemId).single(),
      15000,
      'getCurrentItem'
    ) as { data: any; error: any }

    if (currentItemResult.error || !currentItemResult.data) {
      return {
        success: false,
        error: 'Producto no encontrado',
      }
    }

    const currentItem = currentItemResult.data

    // Generar slug si se cambió el nombre y no se proporcionó slug
    let slug = data.item_slug
    if (!slug && data.item_name && data.item_name !== currentItem.item_name) {
      slug = data.item_name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

      // Verificar que el slug sea único (excepto para el producto actual)
      const { data: existingItem } = await supabase
        .from('store_items')
        .select('id')
        .eq('item_slug', slug)
        .neq('id', itemId)
        .single()

      if (existingItem) {
        // Si el slug ya existe, agregar un número al final
        let counter = 1
        let uniqueSlug = `${slug}-${counter}`
        let exists = true

        while (exists) {
          const { data: checkItem } = await supabase
            .from('store_items')
            .select('id')
            .eq('item_slug', uniqueSlug)
            .neq('id', itemId)
            .single()

          if (!checkItem) {
            exists = false
            slug = uniqueSlug
          } else {
            counter++
            uniqueSlug = `${slug}-${counter}`
          }
        }
      }
    }

    // Preparar datos de actualización (solo campos que se proporcionaron)
    const updateData: any = {}
    
    if (data.item_code !== undefined) updateData.item_code = data.item_code || null
    if (data.item_name !== undefined) updateData.item_name = data.item_name
    if (data.item_description !== undefined) {
      const description = data.item_description?.trim() || null
      updateData.item_description = description
      // Generar item_description_html automáticamente desde item_description
      // Convertir saltos de línea en <br> y envolver en <p>
      updateData.item_description_html = description 
        ? `<p>${description.replace(/\n/g, '<br>')}</p>` 
        : null
    }
    // No permitir actualizar item_description_html directamente, se genera automáticamente
    if (data.category_id !== undefined) updateData.category_id = data.category_id || null
    if (data.base_price !== undefined) updateData.base_price = data.base_price
    if (data.compare_at_price !== undefined) updateData.compare_at_price = data.compare_at_price || null
    if (data.currency_code !== undefined) updateData.currency_code = data.currency_code
    if (data.is_active !== undefined) updateData.is_active = data.is_active
    if (data.is_featured !== undefined) updateData.is_featured = data.is_featured
    if (data.is_available_for_sale !== undefined) updateData.is_available_for_sale = data.is_available_for_sale
    if (data.track_inventory !== undefined) updateData.track_inventory = data.track_inventory
    if (data.inventory_quantity !== undefined) updateData.inventory_quantity = data.inventory_quantity
    if (data.low_stock_threshold !== undefined) updateData.low_stock_threshold = data.low_stock_threshold
    if (slug !== undefined) updateData.item_slug = slug || null
    if (data.seo_title !== undefined) updateData.seo_title = data.seo_title || null
    if (data.seo_description !== undefined) updateData.seo_description = data.seo_description || null
    if (data.metadata !== undefined) updateData.metadata = data.metadata || {}
    if (data.tags !== undefined) updateData.tags = data.tags || []
    if (data.primary_image_url !== undefined) updateData.primary_image_url = data.primary_image_url || null
    if (data.primary_image_alt !== undefined) updateData.primary_image_alt = data.primary_image_alt || null
    if (data.display_order !== undefined) updateData.display_order = data.display_order

    // Actualizar el producto
    const result = await withTimeout(
      supabase
        .from('store_items')
        .update(updateData)
        .eq('id', itemId)
        .select('*, item_categories(*)')
        .single(),
      20000,
      'updateItem'
    ) as { data: any; error: any }

    if (result.error) {
      console.error('[Products] Error al actualizar producto:', result.error)
      return {
        success: false,
        error: result.error.message || 'Error al actualizar el producto',
      }
    }

    const item = result.data as any

    // Si hay imágenes adicionales, actualizar la tabla item_images
    if (additionalImages.length > 0) {
      // Primero, eliminar las imágenes adicionales existentes (mantener solo las que coinciden)
      const { data: existingImages } = await supabase
        .from('item_images')
        .select('*')
        .eq('item_id', itemId)
        .order('display_order', { ascending: true })

      // Eliminar todas las imágenes adicionales existentes
      if (existingImages && existingImages.length > 0) {
        await supabase
          .from('item_images')
          .delete()
          .eq('item_id', itemId)
      }

      // Insertar las nuevas imágenes adicionales
      const imagesToInsert = additionalImages.map((url, index) => ({
        item_id: item.id,
        image_url: url,
        image_alt: `${item.item_name} - Imagen ${index + 2}`,
        display_order: index + 2,
        image_type: 'product',
      }))

      const imagesResult = await withTimeout(
        supabase.from('item_images').insert(imagesToInsert),
        15000,
        'updateAdditionalImages'
      ) as { error: any }
      
      const imagesError = imagesResult.error

      if (imagesError) {
        console.error('[Products] Error al actualizar imágenes adicionales:', imagesError)
        // No se retorna error fatal, el producto ya fue actualizado
      }
    }

    return {
      success: true,
      item: {
        ...item,
        category: item.item_categories ? (item.item_categories as ItemCategory) : undefined,
        variants: [],
        images: [],
        options: [],
      } as StoreItemWithDetails,
    }
  } catch (error: any) {
    console.error('[Products] Error inesperado al actualizar producto:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al actualizar el producto',
    }
  }
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

/**
 * Obtener stock disponible de un producto
 * Retorna null si el producto no rastrea inventario o no existe
 */
export async function getProductStock(productId: string): Promise<number | null> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    const result = await withTimeout(
      supabase
        .from('store_items')
        .select('track_inventory, inventory_quantity, is_available_for_sale, is_active')
        .eq('id', productId)
        .single(),
      10000,
      'getProductStock'
    ) as { data: any; error: any }

    if (result.error || !result.data) {
      return null
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
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return null
    }

    const result = await withTimeout(
      supabase
        .from('item_variants')
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





