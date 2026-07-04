import { getItemsByCategory } from "@/lib/supabase/products-api"
import type { StoreItemWithDetails } from "@/lib/types/products"

function pickFeaturedItem(items: StoreItemWithDetails[]): StoreItemWithDetails | undefined {
  return items.find((item) => item.is_featured) ?? items[0]
}

/**
 * Resolves the product id to showcase for a category's mega-menu panel. An
 * admin-picked `overrideProductId` always wins; otherwise falls back to the
 * category's featured product, or its first product by display order when
 * none is marked featured.
 */
export async function resolveFeaturedProductId(
  categoryId: string,
  overrideProductId?: string | null,
): Promise<string | null> {
  if (overrideProductId) {
    return overrideProductId
  }

  const items = await getItemsByCategory(categoryId)
  return pickFeaturedItem(items)?.id ?? null
}
