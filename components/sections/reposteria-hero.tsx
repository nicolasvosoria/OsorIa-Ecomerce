"use client"

import { useStore } from "@/contexts/store-context"
import { Button } from "@/components/ui/button"
import Link from "next/link"

/**
 * Hero section específico para la tienda de repostería
 * Inspirado en nicolukas.com
 */
export function ReposteriaHero() {
  const { store } = useStore()

  if (store?.subdomain !== 'reposteria') {
    return null
  }

  return (
    <section className="hero-section relative min-h-[600px] flex items-center justify-center">
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-serif mb-6 text-foreground">
            {store.store_name || 'Tienda de Repostería'}
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 font-light">
            Deliciosos pasteles, postres y dulces artesanales
            <br />
            Hechos con amor y los mejores ingredientes
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="primary text-lg px-8 py-6">
              <Link href="/shop">Explorar Productos</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
              <Link href="/catalog">Ver Catálogo</Link>
            </Button>
          </div>
        </div>
      </div>
      {/* Decoración de fondo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-accent rounded-full blur-3xl"></div>
      </div>
    </section>
  )
}

