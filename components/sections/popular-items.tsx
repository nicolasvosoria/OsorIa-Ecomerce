"use client"

import { useEffect, useRef, useState } from "react"
import { useComponentStyle } from "@/contexts/styles-context"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"

export function PopularItems() {
  const { styles: styleData } = useComponentStyle("popular", {
    title: "Lo más vendido",
    priceLabel: "Starting at $29",
  })
  const [api, setApi] = useState<CarouselApi>()
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)

  const items = [
    {
      title: "Bluetooth Speakers",
      price: "Starting at $356",
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      title: "Headphones & Earphones",
      price: "Starting at $29",
      image: "/premium-headphones.png",
    },
    {
      title: "Laptop stands",
      price: "Starting at $82",
      image: "/laptop-stand.png",
    },
    {
      title: "Projectors",
      price: "Starting at $199",
      image: "/mini-projector.jpg",
    },
    {
      title: "Smart Speakers",
      price: "Starting at $89",
      image: "/black-smart-speaker.jpg",
    },
    {
      title: "Wireless Earphones",
      price: "Starting at $45",
      image: "/green-earphones-product.jpg",
    },
    {
      title: "Phone Cases",
      price: "Starting at $25",
      image: "/modern-phone-case-product.jpg",
    },
  ]

  // Auto-play: desplazar cada 30 segundos
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
      }, 30000) // 30 segundos
    }

    // Iniciar auto-play
    startAutoplay()

    // Pausar auto-play cuando el usuario interactúa
    const handleSelect = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current)
      }
      // Reiniciar después de 30 segundos de inactividad
      setTimeout(() => {
        startAutoplay()
      }, 30000)
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
    <section className="py-8 md:py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h2 className="text-2xl md:text-4xl lg:text-[48.4146px] font-inter font-normal" style={{ color: "var(--foreground)" }}>
            {styleData.title || "Lo más vendido"}
          </h2>
        </div>

        <div className="relative">
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {items.map((item, index) => (
                <CarouselItem key={index} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                  <div className="relative group cursor-pointer overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Botón Agregar al carrito - aparece en hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                      <Button
                        className="px-6 py-3 text-sm md:text-base font-inter font-medium rounded-full shadow-lg"
                        style={{
                          backgroundColor: "var(--accent)",
                          color: "var(--accent-foreground)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = "scale(1.05)"
                          e.currentTarget.style.filter = "brightness(1.1)"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = "scale(1)"
                          e.currentTarget.style.filter = "brightness(1)"
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Aquí puedes agregar la lógica para agregar al carrito
                        }}
                      >
                        Agregar al carrito
                      </Button>
                    </div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-center z-0">
                      <h3 className="text-white text-xl md:text-[31.1153px] font-inter font-medium mb-2">{item.title}</h3>
                      <p className="text-white/90 text-sm md:text-[15.447px] font-inter font-medium">{item.price}</p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious 
              className="hidden md:flex -left-12"
              style={{ 
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)"
              }}
            />
            <CarouselNext 
              className="hidden md:flex -right-12"
              style={{ 
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)"
              }}
            />
          </Carousel>
        </div>
      </div>
    </section>
  )
}
