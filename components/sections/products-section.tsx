"use client"

import { ProductCard } from "@/components/product-card"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

const defaultProducts = [
  {
    id: "1",
    name: "Café Natural 454 Gr",
    description: "Perfil de cata intenso y afrutado",
    price: 40000,
    image: "/coffee-bag-natural-process-brown-packaging.jpg",
    badge: "NATURAL",
  },
  {
    id: "2",
    name: "Trilogía HIGHLANDS 454 Gr",
    description: "La Experiencia Completa, Ahora Más Generosa",
    price: 111000,
    originalPrice: 120000,
    image: "/coffee-trilogy-set-three-bags-gift-box.jpg",
    badge: "FAVORITOS",
  },
  {
    id: "3",
    name: "Café Honey 454 Gr",
    description: "Más Dulzura para Más Tazas",
    price: 40000,
    image: "/coffee-bag-honey-process-golden-packaging.jpg",
    badge: "HONEY",
  },
  {
    id: "4",
    name: "Café Lavado 454 Gr",
    description: "Sabor Clásico",
    price: 40000,
    image: "/coffee-bag-washed-process-clean-packaging.jpg",
    badge: "LAVADO",
  },
]

export function ProductsSection() {
  const style = useComponentStyle("products")
  const { componentEdits } = useAdmin()
  
  const edits = componentEdits.get("products") || {}
  const styleData = style as any
  const title = edits.title || styleData.title || "\"Los Favoritos de Nuestros Clientes\""
  const description = edits.description || styleData.description || "Descubre los cafés que enamoran a quienes buscan calidad, aroma y sabor auténtico. Estos son nuestros productos más pedidos, elegidos por amantes del café en Colombia y el mundo. Si no sabes por dónde empezar... empieza por lo que todos aman."
  const products = edits.products || styleData.products || defaultProducts
  
  const bgColor = edits.bgColor || styleData.bgColor
  const textColor = edits.textColor || styleData.textColor

  return (
    <section 
      id="productos" 
      className="py-16 md:py-24 bg-muted/30"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto px-sides">
        <div className="text-center mb-12">
          <h2 
            className="text-3xl md:text-5xl font-bold text-foreground mb-4 text-balance leading-tight"
            style={{ ...(textColor && { color: textColor }) }}
          >
            {title}
          </h2>
          <p 
            className="text-base md:text-lg text-muted-foreground max-w-4xl mx-auto leading-relaxed"
            style={{ ...(textColor && { color: textColor, opacity: 0.8 }) }}
          >
            {description}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
