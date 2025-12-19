"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useTheme } from "@/contexts/theme-context"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"

export function HeroBanner() {
  const { activeTheme } = useTheme()
  const { styles: styleData } = useComponentStyle("hero", {
    label: "Electronics",
    title: "BALFE",
    subtitle: "NUEVO MODELO",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
    buttonText: "Comprar ahora",
  })
  const { componentEdits } = useAdmin()
  const [api, setApi] = useState<CarouselApi>()
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)
  
  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("hero") || {}
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor
  const buttonColor = edits.buttonColor ?? styleData.buttonColor
  const buttonTextColor = edits.buttonTextColor ?? styleData.buttonTextColor
  const barColor = edits.barColor ?? styleData.barColor

  // Array de productos editables para el carrusel
  const defaultProducts = [
    {
      label: "Electrónica",
      title: "BALFE",
      subtitle: "NUEVO MODELO",
      description: "Descubre la última tecnología en dispositivos electrónicos. Calidad premium y diseño innovador para una experiencia única.",
      buttonText: "Comprar ahora",
      image: "/black-smart-speaker.jpg",
    },
    {
      label: "Audio",
      title: "PREMIUM",
      subtitle: "HEADPHONES",
      description: "Experimenta el sonido de alta calidad con nuestros auriculares premium. Diseño ergonómico y cancelación de ruido activa.",
      buttonText: "Ver más",
      image: "/premium-headphones.png",
    },
    {
      label: "Accesorios",
      title: "LAPTOP STAND",
      subtitle: "ERGONÓMICO",
      description: "Mejora tu espacio de trabajo con nuestro soporte para laptop. Diseño moderno y ajustable para mayor comodidad.",
      buttonText: "Comprar ahora",
      image: "/laptop-stand.png",
    },
    {
      label: "Proyección",
      title: "MINI PROJECTOR",
      subtitle: "PORTÁTIL",
      description: "Lleva el cine contigo. Proyector compacto con alta resolución y conectividad inalámbrica para tus presentaciones.",
      buttonText: "Descubrir",
      image: "/mini-projector.jpg",
    },
  ]
  
  // Usar productos editables si existen, sino usar los por defecto
  const heroProducts = edits.products ?? styleData.products ?? defaultProducts

  // Función helper para convertir hex a rgba
  const hexToRgba = (hex: string, alpha: number) => {
    // Si el hex no empieza con #, agregarlo
    const hexColor = hex.startsWith('#') ? hex : `#${hex}`
    // Si el hex es muy corto, usar valores por defecto
    if (hexColor.length < 7) {
      return `rgba(0, 0, 0, ${alpha})`
    }
    try {
      const r = parseInt(hexColor.slice(1, 3), 16)
      const g = parseInt(hexColor.slice(3, 5), 16)
      const b = parseInt(hexColor.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    } catch (e) {
      return `rgba(0, 0, 0, ${alpha})`
    }
  }

  const accentColor = activeTheme?.colors.accent || "#005aa1"
  const secondaryColor = activeTheme?.colors.secondary || "#c4faff"

  // Auto-play: cambiar cada 10 segundos
  useEffect(() => {
    if (!api) return

    const startAutoplay = () => {
      // Limpiar intervalo anterior si existe
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current)
      }

      // Crear nuevo intervalo
      autoplayRef.current = setInterval(() => {
        api.scrollNext()
      }, 10000) // 10 segundos
    }

    // Iniciar auto-play
    startAutoplay()

    // Pausar auto-play cuando el usuario interactúa
    const handleSelect = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current)
      }
      // Reiniciar después de 10 segundos de inactividad
      setTimeout(() => {
        startAutoplay()
      }, 10000)
    }

    api.on("select", handleSelect)

    // Limpiar al desmontar
    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current)
      }
      api.off("select", handleSelect)
    }
  }, [api])

  return (
    <section 
      data-component="hero"
      className="relative overflow-hidden rounded-2xl md:rounded-3xl mx-2 md:mx-4 mt-2 md:mt-4 mb-4 md:mb-8" 
      style={{ 
        backgroundColor: bgColor || "var(--primary)",
        ...(textColor && { color: textColor }),
      }}
    >
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent>
          {heroProducts.map((product, index) => {
            // Usar valores del producto directamente (ya vienen editados)
            const displayLabel = product.label || ""
            const displayTitle = product.title || ""
            const displaySubtitle = product.subtitle || ""
            const displayDescription = product.description || ""
            const displayButtonText = product.buttonText || ""
            const displayImage = product.image || "/placeholder.svg"
            
            return (
            <CarouselItem key={index} className="basis-full">
              <div className="container mx-auto px-4 md:px-8 py-8 md:py-16 lg:py-24">
                <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
                  <div 
                    className="space-y-4 md:space-y-6 text-center md:text-left" 
                    style={{ color: textColor || "var(--primary-foreground)" }}
                  >
                    <span 
                      className="inline-block rounded text-xs md:text-[14.21px] font-inter font-medium rounded-lg px-4 md:px-6 py-1"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                    >
                      {displayLabel}
                    </span>
                    <div>
                      <h1 className="text-4xl md:text-6xl lg:text-[92px] font-inter font-medium tracking-tight leading-tight">
                        {displayTitle}
                      </h1>
                      <h2 className="text-2xl md:text-4xl lg:text-[51px] font-inter font-light tracking-tight">
                        {displaySubtitle}
                      </h2>
                    </div>
                    <p 
                      className="text-sm md:text-[16px] font-inter font-medium max-w-md mx-auto md:mx-0 leading-relaxed"
                      style={{ opacity: 0.9 }}
                    >
                      {displayDescription}
                    </p>
                    <Button
                      size="lg"
                      className="text-sm md:text-[16px] font-inter font-medium rounded px-6 md:px-8 w-full md:w-auto transition-all duration-200 min-h-[44px] touch-manipulation"
                      style={{
                        backgroundColor: buttonColor || "var(--accent)",
                        color: buttonTextColor || "var(--accent-foreground)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.filter = "brightness(0.85)"
                        e.currentTarget.style.transform = "scale(1.02)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.filter = "brightness(1)"
                        e.currentTarget.style.transform = "scale(1)"
                      }}
                    >
                      {displayButtonText} →
                    </Button>
                  </div>

                  {/* Right - Product Image */}
                  <div className="relative h-[250px] md:h-[400px] lg:h-[500px] order-first md:order-last">
                    <Image
                      src={displayImage}
                      alt={displayTitle || "Product image"}
                      width={800}
                      height={600}
                      className="w-full h-full object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                      priority={index === 0}
                    />
                    {/* Feature Callouts - Ocultos en móvil */}
                    <div className="hidden md:block absolute top-[20%] right-[10%] bg-white rounded-full p-3">
                      <div className="w-3 h-3 bg-gray-800 rounded-full" />
                    </div>
                    <div className="hidden md:block absolute top-[45%] left-[15%] bg-white rounded-full p-3">
                      <div className="w-3 h-3 bg-gray-800 rounded-full" />
                    </div>
                    <div className="hidden md:block absolute bottom-[30%] right-[20%] bg-white rounded-full p-3">
                      <div className="w-3 h-3 bg-gray-800 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
            )
          })}
        </CarouselContent>
      </Carousel>

      <div 
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: barColor 
            ? `linear-gradient(to bottom, ${hexToRgba(barColor, 0.8)}, ${hexToRgba(barColor, 0.4)})`
            : `linear-gradient(to bottom, ${hexToRgba(accentColor, 0.8)}, ${hexToRgba(secondaryColor, 0.6)})`,
        }}
      />
    </section>
  )
}
