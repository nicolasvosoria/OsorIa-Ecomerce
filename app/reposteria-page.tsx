import { Suspense } from "react"
import { ReposteriaHero } from "@/components/sections/reposteria-hero"
import { PopularItemsWrapper } from "@/components/sections/popular-items-wrapper"
import { ProductsGridWrapper } from "@/components/sections/products-grid-wrapper"
import { EditableWrapper } from "@/components/admin/editable-wrapper"

/**
 * Página principal específica para la tienda de repostería
 * Diseño inspirado en nicolukas.com
 */
export default async function ReposteriaPage() {
  return (
    <main className="flex flex-col reposteria-main">
      <EditableWrapper componentName="hero" label="Hero">
        <ReposteriaHero />
      </EditableWrapper>
      
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-7xl">
          <h2 className="section-title">Nuestros Productos Destacados</h2>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Cargando productos populares...</div>}>
            <PopularItemsWrapper />
          </Suspense>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <h2 className="section-title">Explora Nuestro Catálogo</h2>
          <Suspense fallback={<div className="py-12 text-center text-muted-foreground">Cargando productos...</div>}>
            <ProductsGridWrapper />
          </Suspense>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="section-title">Sobre Nosotros</h2>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Somos una pastelería artesanal dedicada a crear los más deliciosos pasteles, 
            postres y dulces. Cada producto está hecho con ingredientes de la más alta calidad 
            y mucho amor, para que puedas disfrutar de momentos especiales con cada bocado.
          </p>
        </div>
      </section>
    </main>
  )
}



