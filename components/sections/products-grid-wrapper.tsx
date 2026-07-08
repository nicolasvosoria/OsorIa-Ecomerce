import { ProductsGrid } from "./products-grid"
import { getPopularProductCards, type PopularSelectionMode } from "@/lib/products/popular-sections"
import { resolveItemCount } from "@/lib/sections/products-variant"
import { getComponentStyleByName } from "@/lib/supabase/styles-api"
import type { CommerceProductCard } from "@/lib/types/products"

export async function ProductsGridWrapper() {
  let products: CommerceProductCard[] = []

  try {
    const style = await getComponentStyleByName("products")
    const mode = (style?.variables?.selectionMode as PopularSelectionMode) ?? "display_order"
    const itemCount = resolveItemCount(style?.variables?.itemCount)
    products = await getPopularProductCards(itemCount, mode)
  } catch (error) {
    console.error("Error fetching products:", error)
  }

  return <ProductsGrid initialProducts={products} />
}
