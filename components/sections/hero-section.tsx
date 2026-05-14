/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client"

import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

export function HeroSection() {
  const { styles: styleData } = useComponentStyle("hero", {
    title: "Desde el corazón del Huila para el mundo: Café de origen con historia",
    description: "Descubre el sabor auténtico de un café cultivado en tierras de tradición cafetera. En Highlands Café cosechamos con pasión, procesamos con respeto por la naturaleza y llevamos hasta ti un café de especialidad con historia y carácter.",
    buttonText: "Explora Nuestros Cafés",
    backgroundImage: "/coffee-plantation-mountains-huila-colombia.jpg"
  })
  const { componentEdits } = useAdmin()
  
  const edits = componentEdits.get("hero") || {}
  const title = edits.title || styleData.title || "Desde el corazón del Huila para el mundo: Café de origen con historia"
  const description = edits.description || styleData.description || "Descubre el sabor auténtico de un café cultivado en tierras de tradición cafetera. En Highlands Café cosechamos con pasión, procesamos con respeto por la naturaleza y llevamos hasta ti un café de especialidad con historia y carácter."
  const buttonText = edits.buttonText || styleData.buttonText || "Explora Nuestros Cafés"
  const backgroundImage = edits.backgroundImage || styleData.backgroundImage || "/coffee-plantation-mountains-huila-colombia.jpg"
  
  const bgColor = edits.bgColor || styleData.bgColor
  const textColor = edits.textColor || styleData.textColor

  return (
    <section 
      className="relative min-h-[600px] md:min-h-[700px] flex items-center justify-center overflow-hidden"
      style={{ ...(bgColor && { backgroundColor: bgColor }) }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={backgroundImage || "/placeholder.svg"}
          alt="Plantación de café en Huila"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-sides py-20 text-center">
        <h1 
          className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 text-balance leading-tight"
          style={{ ...(textColor && { color: textColor }) }}
        >
          {title}
        </h1>
        <p 
          className="text-lg md:text-xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed"
          style={{ ...(textColor && { color: textColor, opacity: 0.9 }) }}
        >
          {description}
        </p>
        <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Link href="#productos">{buttonText}</Link>
        </Button>
      </div>
    </section>
  )
}
