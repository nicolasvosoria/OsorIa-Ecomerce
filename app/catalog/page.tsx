import { Suspense } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FooterNew } from "@/components/sections/footer-new"
import { getCategories, getItems } from "@/lib/supabase/products-api"
import { CatalogProductsList } from "@/components/catalog/catalog-products-list"
import { getStoreId } from "@/lib/utils/store"
import { getStoreIdServer } from "@/lib/utils/store-server"
import { headers, cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import { ECOMMERCE_SCHEMA, ECOMMERCE_VIEWS } from "@/lib/supabase/contract"

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
  }).schema(ECOMMERCE_SCHEMA)
}

// Helper para obtener store_id desde headers o subdominio
async function getStoreIdFromRequest(): Promise<string | null> {
  try {
    // Intentar obtener de headers (establecido por middleware)
    const headersList = await headers()
    const storeIdFromHeader = headersList.get('x-store-id')
    if (storeIdFromHeader) {
      console.log('[Catalog] Store ID obtenido de header:', storeIdFromHeader)
      return storeIdFromHeader
    }
    
    // Si no hay header, intentar obtener del subdominio
    const hostname = headersList.get('host') || ''
    const subdomain = getSubdomainFromHostname(hostname)
    
    console.log('[Catalog] Hostname:', hostname, 'Subdomain:', subdomain)
    
    if (subdomain) {
      const supabase = await getSupabaseServerClient()
      if (supabase) {
        const { data: store, error } = await supabase
          .from(ECOMMERCE_VIEWS.storesLegacy)
          .select('id')
          .eq('subdomain', subdomain)
          .eq('is_active', true)
          .single()
        
        if (error) {
          console.error('[Catalog] Error obteniendo tienda por subdominio:', error)
        } else if (store?.id) {
          console.log('[Catalog] Store ID obtenido de subdominio:', store.id)
          return store.id
        }
      }
    }
    
    return null
  } catch (error) {
    console.warn('[Catalog] Error obteniendo store_id:', error)
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

// Componente para mostrar productos de una categoría
async function CategorySection({ categoryId, categoryName, storeId }: { categoryId: string; categoryName: string; storeId: string | null }) {
  try {
    if (!storeId) {
      console.warn(`[Catalog] No hay store_id para la categoría ${categoryName}, saltando...`)
      return null
    }
    
    console.log(`[Catalog] Obteniendo productos para categoría "${categoryName}" (ID: ${categoryId}) con store_id: ${storeId}`)
    
    const result = await getItems({
      store_id: storeId,
      category_id: categoryId,
      is_active: true,
      is_available_for_sale: true,
      limit: 50,
      order_by: 'display_order',
      order_direction: 'asc',
    })
    
    console.log(`[Catalog] Productos obtenidos para "${categoryName}":`, result.items.length)
    
    const products = result.items.map(item => ({
      id: item.id,
      name: item.item_name,
      category: categoryName,
      price: formatPrice(item.base_price, item.currency_code),
      image: item.primary_image_url || "/placeholder.svg",
      slug: item.item_slug || item.id,
    }))
    
    if (products.length === 0) {
      console.log(`[Catalog] No hay productos en la categoría "${categoryName}"`)
      return null
    }
    
    return (
      <section className="mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-inter font-bold mb-6 md:mb-8" style={{ color: "var(--foreground)" }}>
          {categoryName}
        </h2>
        <CatalogProductsList products={products} />
      </section>
    )
  } catch (error) {
    console.error(`[Catalog] Error obteniendo productos para categoría "${categoryName}":`, error)
    if (error instanceof Error) {
      console.error(`[Catalog] Mensaje de error:`, error.message)
    }
    return null
  }
}

// Contenido principal del catálogo
async function CatalogContent() {
  let categories: any[] = []
  let storeId: string | null = null
  
  try {
    // Obtener store_id (getStoreIdServer evita errores de headers() en prerender)
    storeId = await getStoreId()
    if (!storeId) {
      storeId = await getStoreIdServer()
    }
    
    console.log('[Catalog] Store ID obtenido:', storeId)
    
    categories = await getCategories(false, storeId || undefined)
    
    console.log('[Catalog] Categorías obtenidas:', categories.length)
    
    // Filtrar categorías no deseadas
    categories = categories.filter(
      (cat: any) => 
        cat.category_name?.toLowerCase() !== 'sin categoría' &&
        cat.category_name?.toLowerCase() !== 'ropa'
    )
    
    // Ordenar por display_order
    categories.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching categories:', error)
    }
    categories = []
  }
  
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground mb-4">
          No hay categorías disponibles en este momento.
        </p>
        {process.env.NODE_ENV === 'development' && storeId && (
          <p className="text-sm text-muted-foreground mb-2">
            Store ID: {storeId}
          </p>
        )}
        <Button asChild variant="outline">
          <Link href="/">
            Volver al inicio
          </Link>
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-12 md:space-y-16">
      {categories.map((category) => (
        <Suspense
          key={category.id}
          fallback={
            <section className="mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-inter font-bold mb-6 md:mb-8" style={{ color: "var(--foreground)" }}>
                {category.category_name}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-muted rounded-2xl mb-4" />
                    <div className="h-4 bg-muted rounded mb-2" />
                    <div className="h-6 bg-muted rounded mb-4" />
                    <div className="h-10 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </section>
          }
        >
          <CategorySection
            categoryId={category.id}
            categoryName={category.category_name}
            storeId={storeId}
          />
        </Suspense>
      ))}
    </div>
  )
}

export default async function CatalogPage() {
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
            Catálogo Completo
          </h1>
          <p className="text-lg md:text-xl" style={{ color: "var(--muted-foreground)" }}>
            Explora todos nuestros productos organizados por categorías
          </p>
        </div>

        {/* Catálogo con todas las categorías */}
        <Suspense
          fallback={
            <div className="space-y-12 md:space-y-16">
              {Array.from({ length: 3 }).map((_, i) => (
                <section key={i} className="mb-12 md:mb-16">
                  <div className="h-12 bg-muted rounded mb-6 animate-pulse" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="animate-pulse">
                        <div className="aspect-square bg-muted rounded-2xl mb-4" />
                        <div className="h-4 bg-muted rounded mb-2" />
                        <div className="h-6 bg-muted rounded mb-4" />
                        <div className="h-10 bg-muted rounded" />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          }
        >
          <CatalogContent />
        </Suspense>
      </div>

      {/* Footer */}
      <FooterNew />
    </main>
  )
}
