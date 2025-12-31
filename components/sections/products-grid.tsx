"use client"

import Link from "next/link"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useStore } from "@/contexts/store-context"
import { useState } from "react"

// Helper para generar slug desde el nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

// Componente Image con fallback automático a placeholder
function ProductImageWithFallback({ src, alt }: { src: string; alt: string }) {
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
        className="w-full h-full object-contain"
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
      className="w-full h-full object-contain"
      onError={handleError}
    />
  )
}

interface ProductsGridProps {
  initialProducts?: Array<{
    id: string
    name: string
    category: string
    price: string
    image: string
    slug?: string
  }>
}

export function ProductsGrid({ initialProducts }: ProductsGridProps = {}) {
  const { store } = useStore()
  const { styles: styleData } = useComponentStyle("products", {
    title: "Productos populares",
  })
  const { componentEdits } = useAdmin()
  
  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("products") || {}
  const title = edits.title ?? styleData.title ?? "Productos populares"
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor

  // Detectar si es tienda de repostería
  const isReposteria = store?.subdomain === 'reposteria'

  // Obtener productos editables desde estilos o ediciones locales
  // Si es repostería, usar imágenes de repostería, si no, usar imágenes de tecnología
  const defaultProducts = isReposteria ? [
    {
      name: "Cupcakes Decorados",
      category: "Cupcakes",
      price: "$25.00",
      image: "/reposteria/cupcakes-decorados.jpg",
    },
    {
      name: "Tarta de Berries",
      category: "Tartas",
      price: "$45.00",
      image: "/reposteria/tarta-berries.jpg",
    },
    {
      name: "Macarons Artesanales",
      category: "Macarons",
      price: "$18.00",
      image: "/reposteria/macarons-colores.jpg",
    },
  ] : [
    {
      name: "BeShow Volcano",
      category: "Proyectores",
      price: "$1,420.00",
      image: "/white-projector.jpg",
    },
    {
      name: "Soporte para Laptop Desk MUO-g",
      category: "Soportes",
      price: "$82.00",
      image: "/laptop-stand.png",
    },
    {
      name: "BeShow Volcano",
      category: "Proyectores",
      price: "$1,420.00",
      image: "/white-projector.jpg",
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
  ]

  // Priorizar: productos de BD > ediciones > estilos > default
  // Si es repostería y hay productos de BD, reemplazar sus imágenes con imágenes de repostería
  const products = initialProducts && initialProducts.length > 0
    ? initialProducts.map((p, index) => ({
        ...p,
        image: isReposteria 
          ? (reposteriaImages[index % reposteriaImages.length] || p.image)
          : p.image,
      }))
    : (edits.products ?? styleData.products ?? defaultProducts)

  return (
    <section 
      data-component="products" 
      className="py-6 sm:py-8 md:py-12 px-4 sm:px-6"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto max-w-7xl">
        <h2 
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[51px] font-inter font-normal mb-4 sm:mb-6 md:mb-8" 
          style={{ color: textColor || "var(--foreground)" }}
        >
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {products.map((product: any, index: number) => {
            const productSlug = product.slug || generateSlug(product.name)
            const productId = initialProducts?.[index]?.id || `product-${index}`
            return (
              <Link 
                key={productId} 
                href={`/products/${productSlug}`}
                className="rounded-2xl overflow-hidden hover:shadow-lg transition-shadow cursor-pointer block"
                style={{ backgroundColor: "var(--card)" }}
              >
                <div className="p-3 sm:p-4">
                  <h3 className="font-inter font-normal text-sm sm:text-base md:text-[17.4854px] mb-1 hover:text-primary transition-colors" style={{ color: "var(--card-foreground)" }}>
                    {product.name}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-[13.9775px] font-inter font-normal mb-2" style={{ color: "var(--muted-foreground)" }}>{product.category}</p>
                  <p className="text-base sm:text-lg md:text-[20.5864px] font-inter font-normal" style={{ color: "var(--card-foreground)" }}>
                    {product.price}
                  </p>
                </div>

                <div 
                  className="aspect-square flex items-center justify-center p-3 sm:p-4"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  <ProductImageWithFallback
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                  />
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
