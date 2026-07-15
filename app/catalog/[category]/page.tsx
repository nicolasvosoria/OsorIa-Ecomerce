/* eslint-disable react-hooks/error-boundaries -- Server components render fallback UI after async data-loading failures. */
import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getItems } from "@/lib/supabase/products-api"
import { getCategoryBySlug } from "@/lib/supabase/categories-api"
import { CatalogProductsList } from "@/components/catalog/catalog-products-list"
import { getStoreId } from "@/lib/utils/store"
import { notFound } from "next/navigation"
import { getStoreIdServer } from "@/lib/utils/store-server"

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

async function resolveStoreId(): Promise<string | null> {
  return (await getStoreId()) ?? (await getStoreIdServer())
}

export async function generateMetadata(props: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  try {
    const { category: categoryParam } = await props.params
    const storeId = await resolveStoreId()
    if (!storeId) {
      return { title: 'Categoría' }
    }

    const category = await getCategoryBySlug(decodeURIComponent(categoryParam), storeId)
    if (!category) {
      return { title: 'Categoría no encontrada' }
    }

    return {
      title: category.seo_title || category.category_name,
      description:
        category.seo_description || category.category_description || category.category_name,
      openGraph: category.category_image_url
        ? { images: [{ url: category.category_image_url, alt: category.category_name }] }
        : undefined,
    }
  } catch (error) {
    // generateMetadata no puede lanzar sin tumbar el render de la página, así que
    // degrada al título genérico dejando rastro de la causa.
    console.error('[Category] Error al generar metadata:', error)
    return { title: 'Categoría' }
  }
}

// Contenido de la categoría
async function CategoryContent({ categorySlug }: { categorySlug: string }) {
  try {
    const storeId = await resolveStoreId()

    if (!storeId) {
      console.warn('[Category] No se pudo obtener store_id')
      return (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground mb-4">
            No se pudo cargar la categoría. Por favor, intenta de nuevo.
          </p>
          <Button asChild variant="outline">
            <Link href="/">
              Volver al inicio
            </Link>
          </Button>
        </div>
      )
    }
    
    const category = await getCategoryBySlug(categorySlug, storeId)

    if (!category) {
      notFound()
    }

    // Obtener productos de la categoría
    const result = await getItems({
      store_id: storeId,
      category_id: category.id,
      is_active: true,
      is_available_for_sale: true,
      limit: 100,
      order_by: 'display_order',
      order_direction: 'asc',
    })
    
    const products = result.items.map(item => ({
      id: item.id,
      name: item.item_name,
      category: category.category_name,
      price: formatPrice(item.base_price, item.currency_code),
      image: item.primary_image_url || "/placeholder.svg",
      slug: item.item_slug || item.id,
    }))
    
    return (
      <div className="space-y-8">
        <div className="mb-8">
          <h1 className="text-4xl md:text-6xl lg:text-[72px] font-heading font-bold mb-4" style={{ color: "var(--foreground)" }}>
            {category.category_name}
          </h1>
          {category.category_description && (
            <p className="text-lg md:text-xl" style={{ color: "var(--muted-foreground)" }}>
              {category.category_description}
            </p>
          )}
        </div>
        
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground mb-4">
              No hay productos disponibles en esta categoría en este momento.
            </p>
            <Button asChild variant="outline">
              <Link href="/catalog">
                Ver todas las categorías
              </Link>
            </Button>
          </div>
        ) : (
          <CatalogProductsList products={products} />
        )}
      </div>
    )
  } catch (error) {
    console.error('[Category] Error:', error)
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground mb-4">
          Ocurrió un error al cargar la categoría. Por favor, intenta de nuevo.
        </p>
        <Button asChild variant="outline">
          <Link href="/">
            Volver al inicio
          </Link>
        </Button>
      </div>
    )
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const categorySlug = decodeURIComponent(category)
  
  return (
    <main className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8">
          <Link href="/catalog">
            <Button
              variant="ghost"
              className="mb-4 gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al catálogo
            </Button>
          </Link>
        </div>

        {/* Contenido de la categoría */}
        <Suspense
          fallback={
            <div className="space-y-8">
              <div className="h-16 bg-muted rounded mb-6 animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-2xl mb-4" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-6 bg-muted rounded mb-4" />
                    <div className="h-10 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <CategoryContent categorySlug={categorySlug} />
        </Suspense>
      </div>
    </main>
  )
}
