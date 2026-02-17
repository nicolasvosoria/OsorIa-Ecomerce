import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FooterNew } from "@/components/sections/footer-new"
import { getCategories, getItems } from "@/lib/supabase/products-api"
import { CatalogProductsList } from "@/components/catalog/catalog-products-list"
import { getStoreId } from "@/lib/utils/store"
import { headers, cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
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

// Helper para generar slug desde el nombre de categoría
function generateCategorySlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// Helper para obtener cliente de Supabase en el servidor
async function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return null
  }

  const cookieStore = await cookies()
  
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set() {
        // No hacer nada en lectura
      },
      remove() {
        // No hacer nada en lectura
      },
    },
  })
}

// Helper para obtener store_id desde headers o subdominio
async function getStoreIdFromRequest(): Promise<string | null> {
  try {
    // Intentar obtener de headers (establecido por middleware)
    const headersList = await headers()
    const storeIdFromHeader = headersList.get('x-store-id')
    if (storeIdFromHeader) {
      return storeIdFromHeader
    }
    
    // Si no hay header, intentar obtener del subdominio
    const hostname = headersList.get('host') || ''
    const subdomain = getSubdomainFromHostname(hostname)
    
    if (subdomain) {
      const supabase = await getSupabaseServerClient()
      if (supabase) {
        const { data: store, error } = await supabase
          .from('stores')
          .select('id')
          .eq('subdomain', subdomain)
          .eq('is_active', true)
          .single()
        
        if (!error && store?.id) {
          return store.id
        }
      }
    }
    
    return null
  } catch (error) {
    console.warn('[Category] Error obteniendo store_id:', error)
    return null
  }
}

// Helper para extraer subdominio del hostname
function getSubdomainFromHostname(hostname: string): string | null {
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127') {
      return parts[0]
    }
    return 'default'
  }
  
  const parts = hostname.split('.')
  if (parts.length >= 2) {
    const subdomain = parts[0]
    if (subdomain === 'www') {
      return parts.length > 2 ? parts[1] : null
    }
    return subdomain
  }
  
  return null
}

// Contenido de la categoría
async function CategoryContent({ categorySlug }: { categorySlug: string }) {
  let storeId: string | null = null
  let categories: any[] = []
  let category: any = null
  
  try {
    // Obtener store_id de múltiples fuentes
    storeId = await getStoreId()
    
    if (!storeId) {
      storeId = await getStoreIdServer()
    }
    
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
    
    // Obtener todas las categorías
    categories = await getCategories(false, storeId || undefined)
    
    // Filtrar categorías no deseadas
    categories = categories.filter(
      (cat: any) => 
        cat.category_name?.toLowerCase() !== 'sin categoría' &&
        cat.category_name?.toLowerCase() !== 'ropa'
    )
    
    // Buscar la categoría por slug
    category = categories.find(cat => {
      const catSlug = generateCategorySlug(cat.category_name)
      return catSlug === categorySlug
    })
    
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
          <h1 className="text-4xl md:text-6xl lg:text-[72px] font-inter font-bold mb-4" style={{ color: "var(--foreground)" }}>
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

      {/* Footer */}
      <FooterNew />
    </main>
  )
}

