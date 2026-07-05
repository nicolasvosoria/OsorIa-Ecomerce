"use client"

import { Button } from "@/components/ui/button"
import { VisualProductCard } from "@/components/products/visual-product-card"
import { useQuantityModal } from "@/hooks/use-quantity-modal"
import type { CommerceProductCard } from "@/lib/types/products"

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

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function toCatalogCard(product: Product): CommerceProductCard {
  const productSlug = product.slug || generateSlug(product.name)

  return {
    id: product.id,
    title: product.name,
    href: `/products/${productSlug}`,
    imageUrl: product.image || "/placeholder.svg",
    imageAlt: product.name,
    category: product.category,
    price: {
      amount: 0,
      currencyCode: "COP",
      label: product.price,
      hasDiscount: false,
    },
    badges: [],
    availableForSale: true,
  }
}

export function CatalogProductsList({ products }: CatalogProductsListProps) {
  const { openModal, QuantityModalComponent } = useQuantityModal()

  if (products.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No hay productos disponibles en esta categoría.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <VisualProductCard
            key={product.id}
            product={toCatalogCard(product)}
            actionSlot={
              <Button
                className="w-full rounded-full"
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
            }
            showCta={false}
          />
        ))}
      </div>

      {QuantityModalComponent}
    </>
  )
}
