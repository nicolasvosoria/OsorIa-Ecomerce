"use client"

import { useStore } from "@/contexts/store-context"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useState } from "react"

// Componente Image con fallback automático a placeholder
function GalleryImageWithFallback({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError && imgSrc !== "/placeholder.svg") {
      setHasError(true)
      setImgSrc("/placeholder.svg")
    }
  }

  // Si ya hubo error, mostrar placeholder directamente
  if (hasError || imgSrc === "/placeholder.svg") {
    return (
      <img
        src="/placeholder.svg"
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        onError={(e) => {
          // Prevenir loops infinitos
          e.currentTarget.src = "/placeholder.svg"
        }}
      />
    )
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      onError={handleError}
    />
  )
}

/**
 * Galería de imágenes para la tienda de repostería
 * Muestra imágenes de productos, herramientas y decoraciones
 */
export function ReposteriaGallery() {
  const { store } = useStore()
  const { styles: styleData } = useComponentStyle("gallery", {
    title: "Nuestro Mundo Dulce",
    description: "Descubre la creatividad y el arte detrás de cada producto que preparamos con amor",
    images: [
      {
        src: "/reposteria/cupcakes-decorados.jpg",
        alt: "Cupcakes decorados con sprinkles en colores pastel - azul, amarillo y rosa",
        title: "Cupcakes Decorados",
        category: "Productos"
      },
      {
        src: "/reposteria/tarta-berries.jpg",
        alt: "Tarta de frutas con berries frescos, azúcar glass y menta",
        title: "Tarta de Berries",
        category: "Productos"
      },
      {
        src: "/reposteria/macarons-colores.jpg",
        alt: "Macarons en colores pastel - verde, rosa, amarillo y blanco",
        title: "Macarons Artesanales",
        category: "Productos"
      },
      {
        src: "/reposteria/mini-cakes-cheesecakes.jpg",
        alt: "Mini cakes y cheesecakes decorados con berries, chocolate y caramelo",
        title: "Mini Cakes y Cheesecakes",
        category: "Productos"
      },
      {
        src: "/reposteria/galletas-chocolate.jpg",
        alt: "Galletas de chocolate chip caseras",
        title: "Galletas de Chocolate",
        category: "Productos"
      },
      {
        src: "/reposteria/pastel-cumpleanos.jpg",
        alt: "Pastel de cumpleaños decorado con temática festiva y colorida",
        title: "Pasteles de Cumpleaños",
        category: "Productos"
      },
      {
        src: "/reposteria/pastel-boda.jpg",
        alt: "Pastel de boda estilo naked cake decorado con flores frescas",
        title: "Pasteles de Boda",
        category: "Productos"
      },
      {
        src: "/reposteria/herramientas-decoracion.jpg",
        alt: "Herramientas de decoración de pasteles - boquillas, pinceles y fondant",
        title: "Herramientas de Decoración",
        category: "Accesorios"
      },
      {
        src: "/reposteria/sprinkles-candies.jpg",
        alt: "Sprinkles y candies coloridos para decorar postres",
        title: "Sprinkles y Candies",
        category: "Decoraciones"
      },
      {
        src: "/reposteria/chocolates-truffles.jpg",
        alt: "Deliciosos chocolates y truffles artesanales",
        title: "Chocolates Artesanales",
        category: "Productos"
      },
      {
        src: "/reposteria/empaque-presentacion.jpg",
        alt: "Elementos de empaque y presentación para productos de repostería",
        title: "Empaque y Presentación",
        category: "Accesorios"
      }
    ]
  })
  const { componentEdits } = useAdmin()

  if (store?.subdomain !== 'reposteria') {
    return null
  }

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("gallery") || {}
  const title = edits.title ?? styleData.title ?? "Nuestro Mundo Dulce"
  const description = edits.description ?? styleData.description ?? "Descubre la creatividad y el arte detrás de cada producto que preparamos con amor"
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor
  
  // Obtener imágenes: ediciones > estilos de BD > defaults
  const galleryImages: Array<{ src: string; alt: string; title: string; category: string }> = edits.images ?? styleData.images ?? []

  return (
    <section 
      data-component="gallery"
      className="py-10 sm:py-12 md:py-16 lg:py-24 px-4 sm:px-6 bg-gradient-to-b from-background to-muted/20"
      style={{
        ...(bgColor && { background: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-8 sm:mb-10 md:mb-12">
          <h2 
            className="section-title text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-serif mb-3 sm:mb-4 text-foreground"
            style={{ ...(textColor && { color: textColor }) }}
          >
            {title}
          </h2>
          <p 
            className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-2"
            style={{ ...(textColor && { color: textColor, opacity: 0.8 }) }}
          >
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {galleryImages.map((image: { src: string; alt: string; title: string; category: string }, index: number) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="aspect-square relative overflow-hidden bg-muted">
                <GalleryImageWithFallback
                  src={image.src}
                  alt={image.alt}
                />
                {/* Overlay con información */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <span className="text-sm font-medium text-primary-foreground/80 mb-2 block">
                      {image.category}
                    </span>
                    <h3 className="text-xl font-serif font-semibold">
                      {image.title}
                    </h3>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sección adicional con grid más pequeño para más imágenes */}
        <div className="mt-8 sm:mt-10 md:mt-12 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {galleryImages.slice(0, 4).map((image: { src: string; alt: string; title: string; category: string }, index: number) => (
            <div
              key={`small-${index}`}
              className="group relative overflow-hidden rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
            >
              <div className="aspect-square relative overflow-hidden bg-muted">
                <GalleryImageWithFallback
                  src={image.src}
                  alt={image.alt}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

