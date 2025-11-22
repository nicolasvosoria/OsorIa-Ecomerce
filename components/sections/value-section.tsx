"use client"

import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

export function ValueSection() {
  const { styles: styleData } = useComponentStyle("value", {
    title: "Vive el Sabor del Huila\nen Cada Sorbo",
    description: "Prueba un café de origen único, cultivado con pasión en las montañas de Palermo, Huila. En Highlands Café seleccionamos cada grano a mano, aplicamos procesos artesanales y cuidamos cada detalle para ofrecerte una experiencia de café 100% especial, aromático y con historia. ¡Haz de tu día una experiencia inolvidable!",
    statNumber: "1200+",
    statText: "Más de 1.200 tazas servidas al mes con el auténtico sabor de Highlands Café.",
    buttonText: "Compra Ahora y Siente la Diferencia",
    backgroundImage: "/coffee-cherries-branch-close-up-red.jpg"
  })
  const { componentEdits } = useAdmin()
  
  const edits = componentEdits.get("value") || {}
  const title = edits.title || styleData.title || "Vive el Sabor del Huila\nen Cada Sorbo"
  const description = edits.description || styleData.description || "Prueba un café de origen único, cultivado con pasión en las montañas de Palermo, Huila. En Highlands Café seleccionamos cada grano a mano, aplicamos procesos artesanales y cuidamos cada detalle para ofrecerte una experiencia de café 100% especial, aromático y con historia. ¡Haz de tu día una experiencia inolvidable!"
  const statNumber = edits.statNumber || styleData.statNumber || "1200+"
  const statText = edits.statText || styleData.statText || "Más de 1.200 tazas servidas al mes con el auténtico sabor de Highlands Café."
  const buttonText = edits.buttonText || styleData.buttonText || "Compra Ahora y Siente la Diferencia"
  const backgroundImage = edits.backgroundImage || styleData.backgroundImage || "/coffee-cherries-branch-close-up-red.jpg"
  
  const bgColor = edits.bgColor || styleData.bgColor
  const textColor = edits.textColor || styleData.textColor

  return (
    <section 
      className="py-16 md:py-24 bg-background relative overflow-hidden"
      style={{ ...(bgColor && { backgroundColor: bgColor }) }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 opacity-10">
        <img
          src={backgroundImage || "/placeholder.svg"}
          alt="Coffee cherries"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="container mx-auto px-sides relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 
            className="text-3xl md:text-5xl font-bold text-foreground mb-6 text-balance leading-tight whitespace-pre-line"
            style={{ ...(textColor && { color: textColor }) }}
          >
            {title}
          </h2>
          <p 
            className="text-base md:text-lg text-muted-foreground mb-8 leading-relaxed"
            style={{ ...(textColor && { color: textColor, opacity: 0.8 }) }}
          >
            {description}
          </p>
          <div className="bg-card/80 backdrop-blur-sm inline-block px-8 py-4 rounded-lg mb-8">
            <p 
              className="text-4xl md:text-5xl font-bold text-primary mb-2"
              style={{ ...(textColor && { color: textColor }) }}
            >
              {statNumber}
            </p>
            <p 
              className="text-sm text-muted-foreground"
              style={{ ...(textColor && { color: textColor, opacity: 0.7 }) }}
            >
              {statText}
            </p>
          </div>
          <br />
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {buttonText}
          </Button>
        </div>
      </div>
    </section>
  )
}
