import { Suspense } from "react"
import { HeroBanner } from "@/components/sections/hero-banner"
import { ReposteriaHero } from "@/components/sections/reposteria-hero"
import { ReposteriaGallery } from "@/components/sections/reposteria-gallery"
import { ReposteriaAbout } from "@/components/sections/reposteria-about"
import { PopularItemsWrapper } from "@/components/sections/popular-items-wrapper"
import { ProductsGridWrapper } from "@/components/sections/products-grid-wrapper"
import { FeaturedProduct } from "@/components/sections/featured-product"
import { WhyUs } from "@/components/sections/why-us"
import { FooterNew } from "@/components/sections/footer-new"
import { EditableWrapper } from "@/components/admin/editable-wrapper"
import { getStoreFromServer } from "@/lib/supabase/store-api"

/**
 * Componente que muestra contenido diferente según la tienda
 * Para repostería muestra diseño inspirado en nicolukas.com
 * Server Component que obtiene el store desde el servidor
 */
export async function ConditionalHomeContent() {
  const store = await getStoreFromServer()

  // Si es la tienda de repostería, mostrar diseño personalizado
  if (store?.subdomain === 'reposteria') {
    return (
      <main className="flex flex-col reposteria-main">
        <EditableWrapper componentName="hero" label="Hero">
          <ReposteriaHero />
        </EditableWrapper>
        
        <EditableWrapper componentName="products" label="Catálogo de Productos">
          <section className="py-20 px-4 bg-muted/30">
            <div className="container mx-auto max-w-7xl">
              <h2 className="section-title text-4xl md:text-5xl font-serif mb-12 text-center">
                Explora Nuestro Catálogo
              </h2>
              <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Cargando productos...</div>}>
                <ProductsGridWrapper />
              </Suspense>
            </div>
          </section>
        </EditableWrapper>

        {/* Galería de imágenes */}
        <EditableWrapper componentName="gallery" label="Galería de Imágenes">
          <ReposteriaGallery />
        </EditableWrapper>

        <EditableWrapper componentName="about" label="Sobre Nosotros">
          <ReposteriaAbout />
        </EditableWrapper>

        <EditableWrapper componentName="footer" label="Pie de Página">
          <FooterNew />
        </EditableWrapper>
      </main>
    )
  }

  // Página normal para otras tiendas
  return (
    <main className="flex flex-col">
      <EditableWrapper componentName="hero" label="Hero">
        <HeroBanner />
      </EditableWrapper>
      <EditableWrapper componentName="popular" label="Productos Populares">
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Cargando productos populares...</div>}>
          <PopularItemsWrapper />
        </Suspense>
      </EditableWrapper>
      <EditableWrapper componentName="products" label="Productos">
        <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Cargando productos...</div>}>
          <ProductsGridWrapper />
        </Suspense>
      </EditableWrapper>
      <EditableWrapper componentName="featured" label="Producto Destacado">
        <FeaturedProduct />
      </EditableWrapper>
      <EditableWrapper componentName="whyus" label="Por Qué Nosotros">
        <WhyUs />
      </EditableWrapper>
      <EditableWrapper componentName="footer" label="Pie de Página">
        <FooterNew />
      </EditableWrapper>
    </main>
  )
}

