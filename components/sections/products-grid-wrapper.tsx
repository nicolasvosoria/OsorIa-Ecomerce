import { ProductsGrid } from "./products-grid"
import { getPopularProductCards, type PopularSelectionMode } from "@/lib/products/popular-sections"
import { getComponentStyleByName } from "@/lib/supabase/styles-api"
import type { CommerceProductCard } from "@/lib/types/products"

export async function ProductsGridWrapper() {
  let products: CommerceProductCard[] = []

  try {
    const style = await getComponentStyleByName("products")
    const mode = (style?.variables?.selectionMode as PopularSelectionMode) ?? "display_order"
    products = await getPopularProductCards(4, mode)
  } catch (error) {
    console.error("Error fetching products:", error)
  }

  return <ProductsGrid initialProducts={products} />
}
