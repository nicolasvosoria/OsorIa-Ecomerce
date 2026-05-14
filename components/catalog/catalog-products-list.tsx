/* eslint-disable @next/next/no-img-element -- Existing dynamic storefront images intentionally use native img in these legacy components; converting all to next/image is outside the global-gates cleanup risk budget. */
"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useQuantityModal } from "@/hooks/use-quantity-modal"

interface Product {
  id: string
  name: string
  category: string
  price: string
  image: string
  slug?: string
}

interface CatalogProductsListProps {
  products: Product[]
}

export function CatalogProductsList({ products }: CatalogProductsListProps) {
  const { openModal, QuantityModalComponent } = useQuantityModal()

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay productos disponibles en esta categoría.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
        {products.map((product) => {
          const productSlug = product.slug || product.name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
          
          return (
            <div
              key={product.id}
              className="group relative rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
              style={{ backgroundColor: "var(--card)" }}
            >
              {/* Product Image */}
              <Link href={`/products/${productSlug}`}>
                <div
                  className="aspect-square flex items-center justify-center p-6 relative overflow-hidden cursor-pointer"
                  style={{ backgroundColor: "var(--background)" }}
                >
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                  />
                </div>
              </Link>

              {/* Product Info */}
              <div className="p-4 md:p-6">
                <p className="text-sm md:text-base font-inter font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
                  {product.category}
                </p>
                <Link href={`/products/${productSlug}`}>
                  <h3 className="text-lg md:text-xl font-inter font-semibold mb-3 hover:text-primary transition-colors cursor-pointer" style={{ color: "var(--card-foreground)" }}>
                    {product.name}
                  </h3>
                </Link>
                
                {/* Pricing */}
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xl md:text-2xl font-inter font-bold" style={{ color: "var(--primary)" }}>
                    {product.price}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  className="w-full"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.9"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "1"
                  }}
                  onClick={() => {
                    openModal({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      image: product.image,
                      category: product.category,
                    })
                  }}
                >
                  Agregar al carrito
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de cantidad */}
      {QuantityModalComponent}
    </>
  )
}

