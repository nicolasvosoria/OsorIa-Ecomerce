import { VisualProductCard } from "@/components/products/visual-product-card"
import { normalizeCommercePrice } from "@/lib/products/adapter"
import type { CommerceProductCard } from "@/lib/types/products"

interface Product {
  id: string
  name: string
  description: string
  price: number
  originalPrice?: number
  image: string
  badge?: string
  slug?: string
}

// Helper para generar slug desde el nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function ProductCard({ product }: { product: Product }) {
  const productSlug = product.slug || generateSlug(product.name)
  const price = normalizeCommercePrice(product.price, "COP", product.originalPrice)
  const card: CommerceProductCard = {
    id: product.id,
    title: product.name,
    description: product.description,
    href: `/products/${productSlug}`,
    imageUrl: product.image || "/placeholder.svg",
    imageAlt: product.name,
    price,
    badges: [
      ...(product.badge ? [{ label: product.badge, tone: "default" as const }] : []),
      ...(price.hasDiscount ? [{ label: "VENTA", tone: "sale" as const }] : []),
    ],
    ctaLabel: "Ver detalles",
  }
  
  return (
    <VisualProductCard
      product={card}
    />
  )
}
