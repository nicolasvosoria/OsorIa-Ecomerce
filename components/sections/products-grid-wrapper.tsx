import { ProductsGrid } from "./products-grid"
import { toCommerceProductCard } from "@/lib/products/adapter"
import { getItems } from "@/lib/supabase/products-api"
import type { CommerceProductCard } from "@/lib/types/products"

export async function ProductsGridWrapper() {
  // Obtener productos de la base de datos
  let products: CommerceProductCard[] = []
  
  try {
    const result = await getItems({
      limit: 6,
      is_active: true,
      is_available_for_sale: true,
      order_by: 'display_order',
      order_direction: 'asc',
    })
    
    products = result.items.map(toCommerceProductCard)
  } catch (error) {
    console.error('Error fetching products:', error)
  }

  return <ProductsGrid initialProducts={products} />
}
