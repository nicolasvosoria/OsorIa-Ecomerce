"use client"

import { useEffect, useRef, useState } from "react"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { useCart } from "@/contexts/cart-context"
import { toast } from "sonner"

export function PopularItems() {
  const { styles: styleData } = useComponentStyle("popular", {
    title: "Lo más vendido",
    priceLabel: "Desde $29",
  })
  const { componentEdits } = useAdmin()
  const { addToCart } = useCart()
  
  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("popular") || {}
  const title = edits.title ?? styleData.title ?? "Lo más vendido"
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor
  const [api, setApi] = useState<CarouselApi>()
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)

  const items = [
    {
      title: "Bocinas Bluetooth",
      price: "Desde $356",
      image: "/bluetooth-speaker-modern.jpg",
    },
    {
      title: "Auriculares y Audífonos",
      price: "Desde $29",
      image: "/premium-headphones.png",
    },
    {
      title: "Soportes para Laptop",
      price: "Desde $82",
      image: "/laptop-stand.png",
    },
    {
      title: "Proyectores",
      price: "Desde $199",
      image: "/mini-projector.jpg",
    },
    {
      title: "Bocinas Inteligentes",
      price: "Desde $89",
      image: "/black-smart-speaker.jpg",
    },
    {
      title: "Audífonos Inalámbricos",
      price: "Desde $45",
      image: "/green-earphones-product.jpg",
    },
    {
      title: "Fundas para Teléfono",
      price: "Desde $25",
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
    <section 
      data-component="popular" 
      className="py-8 md:py-12 px-4"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h2 
            className="text-2xl md:text-4xl lg:text-[48.4146px] font-inter font-normal" 
            style={{ 
              color: textColor || "var(--foreground)" 
            }}
          >
            {title}
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
                          addToCart({
                            id: `popular-${index}`,
                            name: item.title,
                            price: item.price,
                            image: item.image,
                          })
                          toast.success("Producto agregado al carrito", {
                            description: `${item.title} ha sido agregado exitosamente`,
                            duration: 3000,
                          })
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
