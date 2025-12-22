import { PopularItems } from "./popular-items"
import { getFeaturedItems } from "@/lib/supabase/products-api"

export async function PopularItemsWrapper() {
  // Obtener productos destacados de la base de datos
  let featuredProducts = []
  
  try {
    const items = await getFeaturedItems(10)
    featuredProducts = items.map(item => ({
      id: item.id,
      title: item.item_name,
      price: item.compare_at_price && parseFloat(String(item.compare_at_price)) > parseFloat(String(item.base_price))
        ? `Desde ${formatPrice(item.base_price, item.currency_code)}`
        : `${formatPrice(item.base_price, item.currency_code)}`,
      image: item.primary_image_url || "/placeholder.svg",
      slug: item.item_slug || item.id,
    }))
  } catch (error) {
    console.error('Error fetching featured products:', error)
  }

  return <PopularItems initialProducts={featuredProducts} />
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

