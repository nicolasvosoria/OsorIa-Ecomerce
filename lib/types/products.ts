import type { ComboCatalogDetails } from '@/lib/combos/types'

// Tipos para la base de datos de productos genéricos

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
  metadata?: Record<string, any>
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
  metadata?: Record<string, any>
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
  item_kind?: 'product' | 'combo'
  combo?: ComboCatalogDetails
}

export interface GetItemsParams {
  store_id?: string // ID de la tienda para filtrar productos
  item_kind?: 'all' | 'products' | 'combos'
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




