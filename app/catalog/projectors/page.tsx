import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FooterNew } from "@/components/sections/footer-new"
import { getItems, getCategories } from "@/lib/supabase/products-api"
import { CatalogProductsList } from "@/components/catalog/catalog-products-list"

export default async function ProjectorsPage() {
  // Obtener categoría de Projectors/Proyectores
  let categoryId: string | undefined
  let products: any[] = []
  
  try {
    const categories = await getCategories()
    // Buscar categoría que contenga "projector" o "proyector" en el nombre
    const projectorsCategory = categories.find(cat => 
      cat.category_name.toLowerCase().includes('projector') ||
      cat.category_name.toLowerCase().includes('proyector')
    )
    
    if (projectorsCategory) {
      categoryId = projectorsCategory.id
      const result = await getItems({
        category_id: categoryId,
        is_active: true,
        is_available_for_sale: true,
        limit: 50,
        order_by: 'display_order',
        order_direction: 'asc',
      })
      
      products = result.items.map(item => ({
        id: item.id,
        name: item.item_name,
        category: item.category?.category_name || "Projectors",
        price: formatPrice(item.base_price, item.currency_code),
        image: item.primary_image_url || "/placeholder.svg",
        slug: item.item_slug || item.id,
      }))
    }
  } catch (error) {
    console.error('Error fetching projectors:', error)
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <Link href="/">
            <Button
              variant="ghost"
              className="mb-4 gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Button>
          </Link>
          <h1 className="text-4xl md:text-6xl lg:text-[72px] font-inter font-bold mb-4" style={{ color: "var(--foreground)" }}>
            Projectors
          </h1>
          <p className="text-lg md:text-xl" style={{ color: "var(--muted-foreground)" }}>
            Encuentra el proyector perfecto para tus necesidades
          </p>
        </div>

        {/* Products Grid */}
        <CatalogProductsList products={products} />
      </div>

      {/* Footer */}
      <FooterNew />
    </main>
  )
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
