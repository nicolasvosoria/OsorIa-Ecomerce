"use client"

import Image from "next/image"
import Link from "next/link"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

// Helper para generar slug desde el nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
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
  const { styles: styleData } = useComponentStyle("products", {
    title: "Productos populares",
  })
  const { componentEdits } = useAdmin()
  
  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("products") || {}
  const title = edits.title ?? styleData.title ?? "Productos populares"
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor

  // Obtener productos editables desde estilos o ediciones locales
  const defaultProducts = [
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
  
  // Priorizar: productos de BD > ediciones > estilos > default
  const products = initialProducts && initialProducts.length > 0
    ? initialProducts
    : (edits.products ?? styleData.products ?? defaultProducts)

  return (
    <section 
      data-component="products" 
      className="py-8 md:py-12 px-4"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto max-w-7xl">
        <h2 
          className="text-2xl md:text-4xl lg:text-[51px] font-inter font-normal mb-6 md:mb-8" 
          style={{ color: textColor || "var(--foreground)" }}
        >
          {title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
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
                <div className="p-4">
                  <h3 className="font-inter font-normal text-[17.4854px] mb-1 hover:text-primary transition-colors" style={{ color: "var(--card-foreground)" }}>
                    {product.name}
                  </h3>
                  <p className="text-[13.9775px] font-inter font-normal mb-2" style={{ color: "var(--muted-foreground)" }}>{product.category}</p>
                  <p className="text-[20.5864px] font-inter font-normal" style={{ color: "var(--card-foreground)" }}>
                    {product.price}
                  </p>
                </div>

                <div 
                  className="aspect-square flex items-center justify-center p-4"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    width={400}
                    height={400}
                    className="w-full h-full object-contain"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
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
