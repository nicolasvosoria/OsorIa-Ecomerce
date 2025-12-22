import { Suspense } from "react"
import { HeroBanner } from "@/components/sections/hero-banner"
import { PopularItemsWrapper } from "@/components/sections/popular-items-wrapper"
import { ProductsGridWrapper } from "@/components/sections/products-grid-wrapper"
import { FeaturedProduct } from "@/components/sections/featured-product"
import { WhyUs } from "@/components/sections/why-us"
import { FooterNew } from "@/components/sections/footer-new"
import { EditableWrapper } from "@/components/admin/editable-wrapper"

export default async function Home() {
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
