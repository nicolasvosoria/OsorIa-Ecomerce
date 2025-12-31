"use client"

import { useStore } from "@/contexts/store-context"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState } from "react"

/**
 * Hero section específico para la tienda de repostería
 * Inspirado en nicolukas.com
 */
export function ReposteriaHero() {
  const { store } = useStore()
  const [imageError, setImageError] = useState(false)
  const { styles: styleData } = useComponentStyle("hero", {
    title: "",
    description: "Deliciosos pasteles, postres y dulces artesanales\nHechos con amor y los mejores ingredientes",
    backgroundImage: "/reposteria/pastel-boda.jpg",
    primaryButtonText: "Explorar Productos",
    primaryButtonLink: "/shop",
    secondaryButtonText: "Ver Catálogo",
    secondaryButtonLink: "/catalog",
  })
  const { componentEdits } = useAdmin()

  if (store?.subdomain !== 'reposteria') {
    return null
  }

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("hero") || {}
  
  // Obtener título - usar el editado, luego el de BD, luego el store_name como fallback
  const title = edits.title ?? styleData.title ?? store.store_name ?? 'Tienda de Repostería'
  
  // Obtener descripción - usar el editado, luego el de BD, luego el default
  const description = edits.description ?? styleData.description ?? "Deliciosos pasteles, postres y dulces artesanales\nHechos con amor y los mejores ingredientes"
  
  // Separar descripción en líneas si contiene \n
  const descriptionLines = description.split('\n').filter(line => line.trim())
  
  // Obtener imagen de fondo
  const backgroundImage = edits.backgroundImage ?? styleData.backgroundImage ?? "/reposteria/pastel-boda.jpg"
  const heroImageSrc = imageError ? "/placeholder.svg" : backgroundImage
  
  // Obtener textos y links de botones
  const primaryButtonText = edits.primaryButtonText ?? styleData.primaryButtonText ?? "Explorar Productos"
  const primaryButtonLink = edits.primaryButtonLink ?? styleData.primaryButtonLink ?? "/shop"
  const secondaryButtonText = edits.secondaryButtonText ?? styleData.secondaryButtonText ?? "Ver Catálogo"
  const secondaryButtonLink = edits.secondaryButtonLink ?? styleData.secondaryButtonLink ?? "/catalog"

  // Obtener estilos de texto y borde
  const titleTextColor = edits.titleTextColor ?? styleData.titleTextColor ?? "#ffffff"
  const descriptionTextColor = edits.descriptionTextColor ?? styleData.descriptionTextColor ?? "rgba(255, 255, 255, 0.9)"
  const titleBorderEnabled = edits.titleBorderEnabled === "true" || edits.titleBorderEnabled === true || styleData.titleBorderEnabled === "true" || styleData.titleBorderEnabled === true || false
  const titleBorderColor = edits.titleBorderColor ?? styleData.titleBorderColor ?? "#ffffff"
  const titleBorderWidth = edits.titleBorderWidth ?? styleData.titleBorderWidth ?? "2"

  // Construir estilos del título
  const titleStyle: React.CSSProperties = {
    color: titleTextColor,
  }
  
  if (titleBorderEnabled) {
    titleStyle.textShadow = `-${titleBorderWidth}px -${titleBorderWidth}px 0 ${titleBorderColor}, ${titleBorderWidth}px -${titleBorderWidth}px 0 ${titleBorderColor}, -${titleBorderWidth}px ${titleBorderWidth}px 0 ${titleBorderColor}, ${titleBorderWidth}px ${titleBorderWidth}px 0 ${titleBorderColor}`
  }

  return (
    <section 
      data-component="hero"
      className="hero-section relative min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden py-8 sm:py-12 md:py-16"
    >
      {/* Imagen de fondo */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImageSrc}
          alt="Pastel de boda decorado con flores"
          className="absolute inset-0 w-full h-full object-cover object-center"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-background" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-serif mb-4 sm:mb-6 drop-shadow-lg leading-tight"
            style={titleStyle}
          >
            {title}
          </h1>
          <p 
            className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 font-light drop-shadow-md px-2"
            style={{ color: descriptionTextColor }}
          >
            {descriptionLines.map((line, index) => (
              <span key={index}>
                {line}
                {index < descriptionLines.length - 1 && (
                  <>
                    <br className="hidden sm:block" />
                    <span className="sm:hidden"> </span>
                  </>
                )}
              </span>
            ))}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Button asChild size="lg" className="primary text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-primary hover:bg-primary/90">
              <Link href={primaryButtonLink}>{primaryButtonText}</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Link href={secondaryButtonLink}>{secondaryButtonText}</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}


