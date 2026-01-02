"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import Link from "next/link"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useStore } from "@/contexts/store-context"
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
import { QuantityModal } from "@/components/cart/quantity-modal"

// Helper para generar slug desde el título
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// Componente Image con fallback automático a placeholder
function ItemImageWithFallback({ src, alt }: { src: string; alt: string }) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  // Actualizar imgSrc cuando cambia src (importante para evitar imágenes antiguas)
  useEffect(() => {
    if (src !== imgSrc && !hasError) {
      setImgSrc(src)
      setHasError(false) // Resetear error cuando cambia la fuente
    }
  }, [src])

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
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
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
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
      onError={handleError}
      key={src} // Forzar re-render cuando cambia src
    />
  )
}

interface PopularItemsProps {
  initialProducts?: Array<{
    id: string
    title: string
    price: string
    image: string
    slug?: string
  }>
}

export function PopularItems({ initialProducts }: PopularItemsProps = {}) {
  const [quantityModalOpen, setQuantityModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; price: string; image: string } | null>(null)
  const { store } = useStore()
  const { styles: styleData, loading: stylesLoading } = useComponentStyle("popular", {
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
  
  // Debug: Log para ver qué datos se están cargando
  useEffect(() => {
    console.log('[PopularItems] styleData:', styleData)
    console.log('[PopularItems] edits:', edits)
    console.log('[PopularItems] styleData.items:', styleData.items)
    console.log('[PopularItems] edits.items:', edits.items)
    console.log('[PopularItems] initialProducts:', initialProducts)
  }, [styleData, edits, initialProducts])
  
  // Detectar si es tienda de repostería
  const isReposteria = store?.subdomain === 'reposteria'
  
  // Obtener items editables desde estilos o ediciones locales, o usar productos de BD
  // Si es repostería, usar imágenes de repostería, si no, usar imágenes de tecnología
  const defaultItems = isReposteria ? [
    {
      title: "Cupcakes Decorados",
      price: "Desde $25",
      image: "/reposteria/cupcakes-decorados.jpg",
    },
    {
      title: "Tarta de Berries",
      price: "Desde $45",
      image: "/reposteria/tarta-berries.jpg",
    },
    {
      title: "Macarons Artesanales",
      price: "Desde $18",
      image: "/reposteria/macarons-colores.jpg",
    },
    {
      title: "Mini Cakes y Cheesecakes",
      price: "Desde $35",
      image: "/reposteria/mini-cakes-cheesecakes.jpg",
    },
    {
      title: "Galletas de Chocolate",
      price: "Desde $15",
      image: "/reposteria/galletas-chocolate.jpg",
    },
    {
      title: "Pasteles de Cumpleaños",
      price: "Desde $60",
      image: "/reposteria/pastel-cumpleanos.jpg",
    },
    {
      title: "Pasteles de Boda",
      price: "Desde $150",
      image: "/reposteria/pastel-boda.jpg",
    },
  ] : [
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
  
  // Imágenes de repostería para reemplazar cuando hay productos de BD
  const reposteriaImages = [
    "/reposteria/cupcakes-decorados.jpg",
    "/reposteria/tarta-berries.jpg",
    "/reposteria/macarons-colores.jpg",
    "/reposteria/mini-cakes-cheesecakes.jpg",
    "/reposteria/galletas-chocolate.jpg",
    "/reposteria/pastel-cumpleanos.jpg",
    "/reposteria/pastel-boda.jpg",
  ]

  // Priorizar: ediciones locales > estilos guardados > productos de BD > defaults
  // Los items guardados tienen prioridad sobre los productos de BD
  const items = useMemo(() => {
    // Primero verificar si hay items editados o guardados en estilos
    const savedItems = edits.items ?? styleData.items
    
    if (savedItems && Array.isArray(savedItems) && savedItems.length > 0) {
      console.log('[PopularItems] Usando items guardados:', savedItems.length, 'items')
      return savedItems
    }
    
    // Si no hay items guardados, usar productos de BD si existen
    if (initialProducts && initialProducts.length > 0) {
      console.log('[PopularItems] Usando productos de BD:', initialProducts.length, 'productos')
      return initialProducts.map((p, index) => ({
        title: p.title,
        price: p.price,
        // Usar la imagen del producto de BD si existe, solo usar imagen de repostería como fallback
        image: p.image && p.image !== "/placeholder.svg" 
          ? p.image 
          : (isReposteria 
              ? (reposteriaImages[index % reposteriaImages.length] || "/placeholder.svg")
              : "/placeholder.svg"),
        slug: p.slug,
      }))
    }
    
    // Si no hay productos de BD ni items guardados, usar defaults
    console.log('[PopularItems] Usando items por defecto')
    return defaultItems
  }, [initialProducts, edits.items, styleData.items, isReposteria])
  
  const [api, setApi] = useState<CarouselApi>()
  const autoplayRef = useRef<NodeJS.Timeout | null>(null)

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
              {items.map((item: any, index: number) => {
                const itemSlug = item.slug || generateSlug(item.title)
                const itemId = initialProducts?.[index]?.id || `popular-${index}`
                // Usar una key única que incluya la imagen para forzar re-render cuando cambia
                const imageKey = `${itemId}-${item.image || 'no-image'}`
                return (
                  <CarouselItem key={itemId} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                    <div className="relative group overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100">
                      <Link href={`/products/${itemSlug}`} className="block w-full h-full">
                        <ItemImageWithFallback
                          key={imageKey}
                          src={item.image || "/placeholder.svg"}
                          alt={item.title}
                        />
                      </Link>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                      
                      {/* Botones de acción - aparecen en hover */}
                      <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 z-10">
                        <Button
                          className="px-6 py-3 text-sm md:text-base font-inter font-medium rounded-full shadow-lg min-h-[44px] min-w-[44px] touch-manipulation"
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
                            e.preventDefault()
                            setSelectedItem({
                              id: itemId,
                              name: item.title,
                              price: item.price,
                              image: item.image,
                            })
                            setQuantityModalOpen(true)
                          }}
                        >
                          Agregar al carrito
                        </Button>
                        <Button
                          variant="outline"
                          className="px-6 py-3 text-sm md:text-base font-inter font-medium rounded-full shadow-lg min-h-[44px] min-w-[44px] touch-manipulation"
                          style={{
                            backgroundColor: "var(--background)",
                            color: "var(--foreground)",
                            borderColor: "var(--border)",
                          }}
                          asChild
                        >
                          <Link href={`/products/${itemSlug}`}>
                            Ver detalles
                          </Link>
                        </Button>
                      </div>
                      
                      <Link href={`/products/${itemSlug}`} className="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-center z-0 pointer-events-auto">
                        <h3 className="text-white text-xl md:text-[31.1153px] font-inter font-medium mb-2 hover:underline">{item.title}</h3>
                        <p className="text-white/90 text-sm md:text-[15.447px] font-inter font-medium">{item.price}</p>
                      </Link>
                    </div>
                  </CarouselItem>
                )
              })}
            </CarouselContent>
            <CarouselPrevious 
              className="hidden md:flex -left-12 min-h-[44px] min-w-[44px] touch-manipulation"
              style={{ 
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)"
              }}
            />
            <CarouselNext 
              className="hidden md:flex -right-12 min-h-[44px] min-w-[44px] touch-manipulation"
              style={{ 
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
                color: "var(--foreground)"
              }}
            />
          </Carousel>
        </div>
      </div>

      {/* Modal de cantidad */}
      {selectedItem && (
        <QuantityModal
          open={quantityModalOpen}
          onOpenChange={setQuantityModalOpen}
          onConfirm={(quantity) => {
            addToCart(selectedItem, quantity)
            toast.success("Producto agregado al carrito", {
              description: `${quantity} ${quantity === 1 ? "unidad" : "unidades"} de ${selectedItem.name} ${quantity === 1 ? "ha sido" : "han sido"} agregada${quantity === 1 ? "" : "s"} exitosamente`,
              duration: 3000,
            })
            setSelectedItem(null)
          }}
          productName={selectedItem.name}
          productImage={selectedItem.image}
          maxQuantity={99}
          initialQuantity={1}
        />
      )}
    </section>
  )
}
