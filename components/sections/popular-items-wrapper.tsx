import { PopularItems } from "./popular-items"
import { toCommerceProductCard } from "@/lib/products/adapter"
import { getFeaturedItems } from "@/lib/supabase/products-api"
import type { CommerceProductCard } from "@/lib/types/products"

// Deshabilitar caché para asegurar que siempre se obtengan los productos más recientes
export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function PopularItemsWrapper() {
  let featuredProducts: CommerceProductCard[] = []

  try {
    let items = await getFeaturedItems(10)

    if (items.length === 0) {
      const { getItems } = await import('@/lib/supabase/products-api')
      const result = await getItems({
        is_active: true,
        is_available_for_sale: true,
        limit: 10,
        order_by: 'display_order',
        order_direction: 'asc',
      })
      items = result.items
    }

    featuredProducts = items
      .filter(item => item.item_slug || item.id)
      .map(toCommerceProductCard)
  } catch (error) {
    console.error('Error fetching products:', error)
  }

  return <PopularItems initialProducts={featuredProducts} />
}
