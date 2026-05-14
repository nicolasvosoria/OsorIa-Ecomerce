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
  compareAtPrice?: string
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

function toCard(product: Product): CommerceProductCard {
  const slug = product.slug || generateSlug(product.name)
  return {
    id: product.id,
    title: product.name,
    href: `/products/${slug}`,
    imageUrl: product.image || undefined,
    imageAlt: product.name,
    category: product.category,
    price: {
      amount: 0,
      currencyCode: "COP",
      label: product.price,
      compareAtLabel: product.compareAtPrice,
      hasDiscount: Boolean(product.compareAtPrice),
    },
    badges: product.compareAtPrice ? [{ label: "Oferta", tone: "sale" }] : [],
    ctaLabel: "Ver detalles",
  }
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
        {products.map((product) => (
          <VisualProductCard
            key={product.id}
            product={toCard(product)}
            actionSlot={(
              <Button
                className="w-full"
                style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
                onClick={() => openModal({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image: product.image,
                  category: product.category,
                })}
              >
                Agregar al carrito
              </Button>
            )}
          />
        ))}
      </div>

      {QuantityModalComponent}
    </>
  )
}
