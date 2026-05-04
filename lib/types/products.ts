// Tipos para la base de datos de productos genéricos

export type ProductMetadataJsonValue =
  | string
  | number
  | boolean
  | null
  | ProductMetadataJsonValue[]
  | { [key: string]: ProductMetadataJsonValue }

export type ProductMetadata = Record<string, ProductMetadataJsonValue>

export const PRODUCT_AI_DETAILS_METADATA_KEY = 'ai_details' as const

function isPlainProductMetadata(value: unknown): value is ProductMetadata {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeProductMetadata(metadata: unknown): ProductMetadata {
  const nextMetadata = isPlainProductMetadata(metadata) ? { ...metadata } : {}
  const aiDetails = nextMetadata[PRODUCT_AI_DETAILS_METADATA_KEY]

  if (typeof aiDetails === 'string' && aiDetails.trim()) {
    nextMetadata[PRODUCT_AI_DETAILS_METADATA_KEY] = aiDetails.trim()
  } else if (PRODUCT_AI_DETAILS_METADATA_KEY in nextMetadata) {
    delete nextMetadata[PRODUCT_AI_DETAILS_METADATA_KEY]
  }

  return nextMetadata
}

export function getProductAiDetails(metadata: unknown): string {
  const value = normalizeProductMetadata(metadata)[PRODUCT_AI_DETAILS_METADATA_KEY]
  return typeof value === 'string' ? value.trim() : ''
}

export function mergeProductAiDetailsMetadata(
  metadata: unknown,
  aiDetails: string
): ProductMetadata {
  const nextMetadata = normalizeProductMetadata(metadata)
  const trimmedAiDetails = aiDetails.trim()

  if (trimmedAiDetails) {
    nextMetadata[PRODUCT_AI_DETAILS_METADATA_KEY] = trimmedAiDetails
  } else {
    delete nextMetadata[PRODUCT_AI_DETAILS_METADATA_KEY]
  }

  return nextMetadata
}

export function buildProductAiDetailsMetadataPatch(aiDetails: string): ProductMetadata {
  const trimmedAiDetails = aiDetails.trim()

  return {
    [PRODUCT_AI_DETAILS_METADATA_KEY]: trimmedAiDetails || null,
  }
}

export function mergeProductMetadataForUpdate(
  existingMetadata: unknown,
  metadataPatch: unknown
): ProductMetadata {
  const nextMetadata = normalizeProductMetadata(existingMetadata)
  const patch = isPlainProductMetadata(metadataPatch) ? { ...metadataPatch } : {}

  for (const [key, value] of Object.entries(patch)) {
    if (key === PRODUCT_AI_DETAILS_METADATA_KEY) {
      if (typeof value === 'string' && value.trim()) {
        nextMetadata[key] = value.trim()
      } else {
        delete nextMetadata[key]
      }
      continue
    }

    nextMetadata[key] = value
  }

  return nextMetadata
}

export interface ItemCategory {
  id: string
  category_name: string
  category_description?: string
  category_image_url?: string
  parent_category_id?: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StoreItem {
  id: string
  item_code?: string
  item_name: string
  item_description?: string
  item_description_html?: string
  category_id?: string
  base_price: number
  compare_at_price?: number
  currency_code: string
  is_active: boolean
  is_featured: boolean
  is_available_for_sale: boolean
  track_inventory: boolean
  inventory_quantity: number
  low_stock_threshold: number
  item_slug?: string
  seo_title?: string
  seo_description?: string
  metadata?: ProductMetadata
  tags?: string[]
  primary_image_url?: string
  primary_image_alt?: string
  display_order: number
  view_count: number
  created_at: string
  updated_at: string
}

export interface ItemVariant {
  id: string
  item_id: string
  variant_code?: string
  price?: number
  compare_at_price?: number
  variant_options?: Record<string, any>
  track_inventory: boolean
  inventory_quantity: number
  is_available: boolean
  is_default: boolean
  image_url?: string
  image_alt?: string
  metadata?: ProductMetadata
  created_at: string
  updated_at: string
}

export interface ItemImage {
  id: string
  item_id?: string
  variant_id?: string
  image_url: string
  image_alt?: string
  image_title?: string
  display_order: number
  width?: number
  height?: number
  image_type: string
  created_at: string
}

export interface ItemOption {
  id: string
  item_id: string
  option_name: string
  option_values: string[]
  display_order: number
  is_required: boolean
  created_at: string
}

// Tipos para respuestas de API
export interface StoreItemWithDetails extends StoreItem {
  category?: ItemCategory
  variants?: ItemVariant[]
  images?: ItemImage[]
  options?: ItemOption[]
}

export interface GetItemsParams {
  store_id?: string // ID de la tienda para filtrar productos
  category_id?: string
  is_active?: boolean
  is_featured?: boolean
  is_available_for_sale?: boolean
  search?: string
  tags?: string[]
  limit?: number
  offset?: number
  order_by?: 'created_at' | 'display_order' | 'item_name' | 'base_price' | 'view_count'
  order_direction?: 'asc' | 'desc'
}

export interface GetItemsResult {
  items: StoreItemWithDetails[]
  total: number
  has_more: boolean
}


