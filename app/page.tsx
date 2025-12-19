import { HeroBanner } from "@/components/sections/hero-banner"
import { PopularItems } from "@/components/sections/popular-items"
import { ProductsGrid } from "@/components/sections/products-grid"
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
        <PopularItems />
      </EditableWrapper>
      <EditableWrapper componentName="products" label="Productos">
        <ProductsGrid />
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
