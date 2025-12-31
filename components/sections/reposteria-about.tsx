"use client"

import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

/**
 * Sección "Sobre Nosotros" para la tienda de repostería
 */
export function ReposteriaAbout() {
  const { styles: styleData } = useComponentStyle("about", {
    title: "Sobre Nosotros",
    description: "Somos una pastelería artesanal dedicada a crear los más deliciosos pasteles, postres y dulces. Cada producto está hecho con ingredientes de la más alta calidad y mucho amor, para que puedas disfrutar de momentos especiales con cada bocado.",
  })
  const { componentEdits } = useAdmin()
  
  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("about") || {}
  const title = edits.title ?? styleData.title ?? "Sobre Nosotros"
  const description = edits.description ?? styleData.description ?? "Somos una pastelería artesanal dedicada a crear los más deliciosos pasteles, postres y dulces. Cada producto está hecho con ingredientes de la más alta calidad y mucho amor, para que puedas disfrutar de momentos especiales con cada bocado."
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor

  return (
    <section 
      data-component="about"
      className="py-12 sm:py-16 md:py-20 px-4 sm:px-6"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto max-w-4xl text-center">
        <h2 
          className="section-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif mb-6 sm:mb-8"
          style={{ ...(textColor && { color: textColor }) }}
        >
          {title}
        </h2>
        <p 
          className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto px-2"
          style={{ ...(textColor && { color: textColor, opacity: 0.9 }) }}
        >
          {description}
        </p>
      </div>
    </section>
  )
}

