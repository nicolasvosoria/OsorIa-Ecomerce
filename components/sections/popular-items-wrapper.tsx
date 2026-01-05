import { PopularItems } from "./popular-items"
import { getFeaturedItems } from "@/lib/supabase/products-api"

// Deshabilitar caché para asegurar que siempre se obtengan los productos más recientes
export const revalidate = 0
export const dynamic = 'force-dynamic'

export async function PopularItemsWrapper() {
  // Obtener productos destacados de la base de datos
  let featuredProducts: Array<{ id: string; title: string; price: string; image: string; slug: string }> = []
  
  try {
    // Primero intentar obtener productos destacados
    let items = await getFeaturedItems(10)
    
    // Si no hay productos destacados, obtener productos activos y disponibles
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
    
    // Mapear productos asegurando que todos tengan slug válido
    featuredProducts = items
      .filter(item => item.item_slug || item.id) // Solo productos con slug o ID válido
      .map(item => ({
        id: item.id,
        title: item.item_name,
        price: item.compare_at_price && parseFloat(String(item.compare_at_price)) > parseFloat(String(item.base_price))
          ? `Desde ${formatPrice(item.base_price, item.currency_code)}`
          : `${formatPrice(item.base_price, item.currency_code)}`,
        // Asegurar que siempre se use la URL completa de la imagen
        image: item.primary_image_url && item.primary_image_url.trim() !== "" 
          ? item.primary_image_url 
          : "/placeholder.svg",
        // Asegurar que siempre haya un slug válido (priorizar item_slug, luego ID)
        slug: item.item_slug || item.id,
      }))
    
    console.log('[PopularItemsWrapper] Productos obtenidos de BD:', featuredProducts.length, 'productos')
    if (featuredProducts.length > 0) {
      console.log('[PopularItemsWrapper] Primer producto:', featuredProducts[0]?.title, 'Slug:', featuredProducts[0]?.slug)
    }
  } catch (error) {
    console.error('Error fetching products:', error)
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

