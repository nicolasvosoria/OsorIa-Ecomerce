/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client"

import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

const defaultProducts = [
  {
    id: "1",
    name: "Café Natural 250 Gr",
    description: "Intensidad en Cada Sorbo",
    image: "/coffee-bag-natural-250g-small.jpg",
  },
  {
    id: "2",
    name: "Café Honey 250 Gr",
    description: "Dulzura Natural desde el Corazón del Huila",
    image: "/coffee-bag-honey-250g-small.jpg",
  },
  {
    id: "3",
    name: "Café Lavado 454 Gr",
    description: "Sabor Clásico",
    image: "/coffee-bag-washed-454g.jpg",
  },
  {
    id: "4",
    name: "Café Honey 454 Gr",
    description: "Más Dulzura para Más Tazas",
    image: "/coffee-bag-honey-454g.jpg",
  },
]

export function TrendingSection() {
  const style = useComponentStyle("trending")
  const { componentEdits } = useAdmin()
  
  const edits = componentEdits.get("trending") || {}
  const styleData = style as any
  const title = edits.title || styleData.title || "TENDENCIAS"
  const products = edits.products || styleData.products || defaultProducts
  
  const bgColor = edits.bgColor || styleData.bgColor
  const textColor = edits.textColor || styleData.textColor

  return (
    <section 
      className="py-16 md:py-24 bg-muted/30"
      style={{ ...(bgColor && { backgroundColor: bgColor }) }}
    >
      <div className="container mx-auto px-sides">
        <h2 
          className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center"
          style={{ ...(textColor && { color: textColor }) }}
        >
          {title}
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product: any) => (
            <div
              key={product.id}
              className="bg-card rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-square">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 
                  className="font-bold text-foreground mb-1"
                  style={{ ...(textColor && { color: textColor }) }}
                >
                  {product.name}
                </h3>
                <p 
                  className="text-sm text-muted-foreground"
                  style={{ ...(textColor && { color: textColor, opacity: 0.7 }) }}
                >
                  {product.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
