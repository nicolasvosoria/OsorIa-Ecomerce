import type { StoreItemWithDetails } from '@/lib/types/products'

export type RelatedProductCard = {
  id: string
  item_slug?: string | null
  item_name: string
  base_price: number
  compare_at_price?: number | null
  currency_code: string
  primary_image_url?: string | null
  primary_image_alt?: string | null
  images?: Array<{ image_url?: string | null }>
}

export function toRelatedProductCards(items: StoreItemWithDetails[]): RelatedProductCard[] {
  return items.map((item) => ({
    id: item.id,
    item_slug: item.item_slug ?? null,
    item_name: item.item_name,
    base_price: item.base_price,
    compare_at_price: item.compare_at_price ?? null,
    currency_code: item.currency_code,
    primary_image_url: item.primary_image_url ?? null,
    primary_image_alt: item.primary_image_alt ?? null,
    images: item.images?.map((image) => ({
      image_url: image.image_url ?? null,
    })),
  }))
}
