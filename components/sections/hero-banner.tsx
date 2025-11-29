"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
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
  const [api, setApi] = useState<CarouselApi>()
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)

  // Array de productos para el carrusel
  const heroProducts = [
    {
      label: "Electronics",
      title: "BALFE",
      subtitle: "NUEVO MODELO",
      description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
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

  // Función helper para convertir hex a rgba
  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
    <section className="relative overflow-hidden rounded-2xl md:rounded-3xl mx-2 md:mx-4 mt-2 md:mt-4 mb-4 md:mb-8" style={{ backgroundColor: "var(--primary)" }}>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent>
          {heroProducts.map((product, index) => (
            <CarouselItem key={index} className="basis-full">
              <div className="container mx-auto px-4 md:px-8 py-8 md:py-16 lg:py-24">
                <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
                  <div className="space-y-4 md:space-y-6 text-center md:text-left" style={{ color: "var(--primary-foreground)" }}>
                    <span 
                      className="inline-block rounded text-xs md:text-[14.21px] font-inter font-medium rounded-lg px-4 md:px-6 py-1"
                      style={{ backgroundColor: "rgba(255, 255, 255, 0.2)" }}
                    >
                      {product.label}
                    </span>
                    <div>
                      <h1 className="text-4xl md:text-6xl lg:text-[92px] font-inter font-medium tracking-tight leading-tight">
                        {product.title}
                      </h1>
                      <h2 className="text-2xl md:text-4xl lg:text-[51px] font-inter font-light tracking-tight">
                        {product.subtitle}
                      </h2>
                    </div>
                    <p 
                      className="text-sm md:text-[16px] font-inter font-medium max-w-md mx-auto md:mx-0 leading-relaxed"
                      style={{ opacity: 0.9 }}
                    >
                      {product.description}
                    </p>
                    <Button
                      size="lg"
                      className="text-sm md:text-[16px] font-inter font-medium rounded px-6 md:px-8 w-full md:w-auto transition-all duration-200"
                      style={{
                        backgroundColor: "var(--accent)",
                        color: "var(--accent-foreground)",
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
                      {product.buttonText} →
                    </Button>
                  </div>

                  {/* Right - Product Image */}
                  <div className="relative h-[250px] md:h-[400px] lg:h-[500px] order-first md:order-last">
                    <img src={product.image} alt={product.title} className="w-full h-full object-contain" />
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
          ))}
        </CarouselContent>
      </Carousel>

      <div 
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom, 
            ${hexToRgba(accentColor, 0.8)},
            ${hexToRgba(secondaryColor, 0.6)}
          )`,
        }}
      />
    </section>
  )
}
