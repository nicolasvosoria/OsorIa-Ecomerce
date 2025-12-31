"use client"

import { useStore } from "@/contexts/store-context"
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

  if (store?.subdomain !== 'reposteria') {
    return null
  }

  const heroImageSrc = imageError ? "/placeholder.jpg" : "/reposteria/pastel-boda.jpg"

  return (
    <section className="hero-section relative min-h-[400px] sm:min-h-[500px] md:min-h-[600px] lg:min-h-[700px] flex items-center justify-center overflow-hidden">
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

      <div className="container mx-auto px-4 sm:px-6 relative z-10 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-serif mb-4 sm:mb-6 text-white drop-shadow-lg leading-tight">
            {store.store_name || 'Tienda de Repostería'}
          </h1>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-6 sm:mb-8 font-light drop-shadow-md px-2">
            Deliciosos pasteles, postres y dulces artesanales
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            Hechos con amor y los mejores ingredientes
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <Button asChild size="lg" className="primary text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-primary hover:bg-primary/90">
              <Link href="/shop">Explorar Productos</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6 bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Link href="/catalog">Ver Catálogo</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}


