/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client"

import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

export function AboutSection() {
  const { styles: styleData } = useComponentStyle("about", {
    title: "Café con Raíces,\nTradición y Orgullo\nColombiano",
    description: "En Highlands Café somos una familia cafetera del Huila que cultiva con amor y dedicación cada grano. Desde nuestra finca en Palermo, producimos cafés de especialidad con procesos artesanales, cuidando cada detalle para ofrecer una experiencia única en aroma, sabor y origen.\n\nNuestro compromiso es llevar a tu mesa un café que cuente una historia: la nuestra.",
    ceoName: "Sofía Ramírez",
    ceoTitle: "CEO",
    ceoImage: "/coffee-producer-woman-professional-portrait.jpg"
  })
  const { componentEdits } = useAdmin()
  
  const edits = componentEdits.get("about") || {}
  const title = edits.title || styleData.title || "Café con Raíces,\nTradición y Orgullo\nColombiano"
  const description = edits.description || styleData.description || "En Highlands Café somos una familia cafetera del Huila que cultiva con amor y dedicación cada grano. Desde nuestra finca en Palermo, producimos cafés de especialidad con procesos artesanales, cuidando cada detalle para ofrecer una experiencia única en aroma, sabor y origen.\n\nNuestro compromiso es llevar a tu mesa un café que cuente una historia: la nuestra."
  const ceoName = edits.ceoName || styleData.ceoName || "Sofía Ramírez"
  const ceoTitle = edits.ceoTitle || styleData.ceoTitle || "CEO"
  const ceoImage = edits.ceoImage || styleData.ceoImage || "/coffee-producer-woman-professional-portrait.jpg"
  
  const bgColor = edits.bgColor || styleData.bgColor
  const textColor = edits.textColor || styleData.textColor

  console.log("[v0] AboutSection - styleData:", styleData)
  console.log("[v0] AboutSection - edits:", edits)

  return (
    <section 
      id="nosotros" 
      className="py-16 md:py-24 bg-background"
      style={{ ...(bgColor && { backgroundColor: bgColor }) }}
    >
      <div className="container mx-auto px-sides">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 
              className="text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance leading-tight whitespace-pre-line"
              style={{ ...(textColor && { color: textColor }) }}
            >
              {title}
            </h2>
            <p 
              className="text-base md:text-lg text-muted-foreground leading-relaxed whitespace-pre-line"
              style={{ ...(textColor && { color: textColor, opacity: 0.8 }) }}
            >
              {description}
            </p>
          </div>
          <div className="relative">
            <div className="bg-card p-8 rounded-lg shadow-lg text-center">
              <img
                src={ceoImage || "/placeholder.svg"}
                alt={ceoName}
                className="w-48 h-48 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 
                className="text-xl font-bold text-foreground mb-1"
                style={{ ...(textColor && { color: textColor }) }}
              >
                {ceoName}
              </h3>
              <p 
                className="text-sm text-muted-foreground"
                style={{ ...(textColor && { color: textColor, opacity: 0.7 }) }}
              >
                {ceoTitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
