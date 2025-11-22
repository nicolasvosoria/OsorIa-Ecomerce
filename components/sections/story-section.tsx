"use client"

import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

export function StorySection() {
  const { styles: styleData } = useComponentStyle("story", {
    title: "\"Una Historia que se\nSaborea en Cada Taza\"",
    description: "En Highlands Café no solo producimos un excelente grano, construimos un puente entre nuestras montañas y las mesas del mundo, compartiendo la esencia del Huila en cada sorbo. Somos pasión por el origen, por el detalle y por el café que deja huella.",
    buttonText: "Conoce Nuestra Historia"
  })
  const { componentEdits } = useAdmin()
  
  const edits = componentEdits.get("story") || {}
  const title = edits.title || styleData.title || "\"Una Historia que se\nSaborea en Cada Taza\""
  const description = edits.description || styleData.description || "En Highlands Café no solo producimos un excelente grano, construimos un puente entre nuestras montañas y las mesas del mundo, compartiendo la esencia del Huila en cada sorbo. Somos pasión por el origen, por el detalle y por el café que deja huella."
  const buttonText = edits.buttonText || styleData.buttonText || "Conoce Nuestra Historia"
  
  const bgColor = edits.bgColor || styleData.bgColor
  const textColor = edits.textColor || styleData.textColor

  return (
    <section 
      className="py-16 md:py-24 bg-muted/30"
      style={{ ...(bgColor && { backgroundColor: bgColor }) }}
    >
      <div className="container mx-auto px-sides">
        <div className="max-w-4xl mx-auto text-center">
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
          <Button
            variant="outline"
            size="lg"
            className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </section>
  )
}
