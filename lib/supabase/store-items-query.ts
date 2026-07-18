import type { GetItemsParams, ItemCategory, StoreItemWithDetails } from '@/lib/types/products'
import type { ComboCatalogDetails } from '@/lib/combos/types'
import { comboToStoreItem } from './combos-api'

// Columnas del catálogo con su categoría embebida, compartidas por las lecturas de producto
export const STORE_ITEMS_SELECT = '*, item_categories(*)'

export function mapStoreItemRow(row: any): StoreItemWithDetails {
  return {
    ...row,
    item_kind: 'product',
    category: row.item_categories ? (row.item_categories as ItemCategory) : undefined,
  }
}

export function comboItemsMatching(
  combos: ComboCatalogDetails[],
  filters: {
    isAvailableForSale?: boolean
    search?: string
    onSale?: boolean
    priceMin?: number
    priceMax?: number
  },
): StoreItemWithDetails[] {
  const isAvailableForSale = filters.isAvailableForSale ?? true
  const { search, onSale, priceMin, priceMax } = filters

  return combos
    .filter((combo) =>
      isAvailableForSale === false ? !combo.availability.isAvailable : combo.availability.isAvailable,
    )
    .filter((combo) => {
      if (!search) return true
      const normalizedSearch = search.toLowerCase()
      return (
        combo.name.toLowerCase().includes(normalizedSearch) ||
        (combo.description || '').toLowerCase().includes(normalizedSearch)
      )
    })
    .map(comboToStoreItem)
    .filter((item) => {
      if (priceMin !== undefined && item.base_price < priceMin) return false
      if (priceMax !== undefined && item.base_price > priceMax) return false
      if (onSale && !(item.compare_at_price != null && item.compare_at_price > item.base_price)) return false
      return true
    })
}

export function sortStoreItems(
  items: StoreItemWithDetails[],
  orderBy: NonNullable<GetItemsParams['order_by']>,
  orderDirection: NonNullable<GetItemsParams['order_direction']>,
): StoreItemWithDetails[] {
  const direction = orderDirection === 'asc' ? 1 : -1

  return [...items].sort((a, b) => {
    const aValue = a[orderBy] ?? 0
    const bValue = b[orderBy] ?? 0
    if (typeof aValue === 'number' && typeof bValue === 'number') return (aValue - bValue) * direction
    return String(aValue).localeCompare(String(bValue)) * direction
  })
}
