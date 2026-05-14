import { ProductsGrid } from "./products-grid"
import { getItems } from "@/lib/supabase/products-api"
import { resolveProductPricing } from "@/lib/shopify/utils"

export async function ProductsGridWrapper() {
  // Obtener productos de la base de datos
  let products: Array<{ id: string; name: string; category: string; price: string; compareAtPrice?: string; savingsLabel?: string; image: string; slug: string }> = []
  
  try {
    const result = await getItems({
      limit: 6,
      is_active: true,
      is_available_for_sale: true,
      order_by: 'display_order',
      order_direction: 'asc',
    })
    
    products = result.items.map(item => {
      const pricing = resolveProductPricing(
        { amount: String(item.base_price), currencyCode: item.currency_code },
        item.compare_at_price ? { amount: String(item.compare_at_price), currencyCode: item.currency_code } : undefined,
      )

      return {
        id: item.id,
        name: item.item_name,
        category: item.category?.category_name || "Sin categoría",
        price: pricing.formattedCurrentPrice,
        compareAtPrice: pricing.formattedCompareAtPrice,
        savingsLabel: pricing.savingsLabel,
        image: item.primary_image_url || "/placeholder.svg",
        slug: item.item_slug || item.id,
      }
    })
  } catch (error) {
    console.error('Error fetching products:', error)
  }

  return <ProductsGrid initialProducts={products} />
}
