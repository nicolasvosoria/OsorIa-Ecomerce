import { ProductsGrid } from "./products-grid"
import { getItems } from "@/lib/supabase/products-api"

export async function ProductsGridWrapper() {
  // Obtener productos de la base de datos
  let products: Array<{ id: string; name: string; category: string; price: string; image: string; slug: string }> = []
  
  try {
    const result = await getItems({
      limit: 6,
      is_active: true,
      is_available_for_sale: true,
      order_by: 'display_order',
      order_direction: 'asc',
    })
    
    products = result.items.map(item => ({
      id: item.id,
      name: item.item_name,
      category: item.category?.category_name || "Sin categoría",
      price: formatPrice(item.base_price, item.currency_code),
      image: item.primary_image_url || "/placeholder.svg",
      slug: item.item_slug || item.id,
    }))
  } catch (error) {
    console.error('Error fetching products:', error)
  }

  return <ProductsGrid initialProducts={products} />
}

// Helper para formatear precio
function formatPrice(price: number | string, currencyCode: string = "COP"): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numPrice)
}

