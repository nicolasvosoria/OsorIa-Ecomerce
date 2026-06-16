"use client"

import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useStore } from "@/contexts/store-context"
import { VisualProductCard } from "@/components/products/visual-product-card"
import { normalizeCommercePrice } from "@/lib/products/adapter"
import type { CommerceProductBadge, CommerceProductCard, CommerceProductPrice } from "@/lib/types/products"

// Helper para generar slug desde el nombre
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

type EditableProduct = Partial<CommerceProductCard> & {
  name?: string
  title?: string
  slug?: string
  image?: string
  imageUrl?: string
  price?: string | number | CommerceProductPrice
  originalPrice?: number
  compareAtPrice?: number
  badge?: string
  badges?: CommerceProductBadge[]
}

interface ProductsGridProps {
  initialProducts?: CommerceProductCard[]
}

function isCommercePrice(price: EditableProduct["price"]): price is CommerceProductPrice {
  return Boolean(price && typeof price === "object" && "label" in price)
}

function toCard(product: EditableProduct, index: number): CommerceProductCard {
  const title = product.title || product.name || `Producto ${index + 1}`
  const slug = product.slug || generateSlug(title)
  const price = isCommercePrice(product.price)
    ? product.price
    : typeof product.price === "number"
      ? normalizeCommercePrice(product.price, "COP", product.originalPrice ?? product.compareAtPrice)
      : {
          amount: 0,
          currencyCode: "COP",
          label: product.price || "",
          hasDiscount: false,
        }
  const saleBadge = price.hasDiscount ? [{ label: "Oferta", tone: "sale" as const }] : []

  return {
    id: product.id || `product-${index}`,
    title,
    description: product.description,
    href: product.href || `/products/${slug}`,
    imageUrl: product.imageUrl || product.image || undefined,
    imageAlt: product.imageAlt || title,
    category: product.category,
    price,
    badges: product.badges || [
      ...(product.badge ? [{ label: product.badge, tone: "default" as const }] : []),
      ...saleBadge,
    ],
    ctaLabel: product.ctaLabel || "Ver detalles",
    availableForSale: product.availableForSale,
  }
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
      id: "cupcakes-decorados",
      name: "Cupcakes Decorados",
      category: "Cupcakes",
      price: "$25.00",
      image: "/reposteria/cupcakes-decorados.jpg",
    },
    {
      id: "tarta-berries",
      name: "Tarta de Berries",
      category: "Tartas",
      price: "$45.00",
      image: "/reposteria/tarta-berries.jpg",
    },
    {
      id: "macarons-artesanales",
      name: "Macarons Artesanales",
      category: "Macarons",
      price: "$18.00",
      image: "/reposteria/macarons-colores.jpg",
    },
  ] : [
    {
      id: "beshow-volcano",
      name: "BeShow Volcano",
      category: "Proyectores",
      price: "$1,420.00",
      image: "/white-projector.jpg",
    },
    {
      id: "soporte-laptop-desk-muo-g",
      name: "Soporte para Laptop Desk MUO-g",
      category: "Soportes",
      price: "$82.00",
      image: "/laptop-stand.png",
    },
    {
      id: "beshow-volcano-alt",
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
        imageUrl: isReposteria
          ? (reposteriaImages[index % reposteriaImages.length] || p.imageUrl)
          : p.imageUrl,
      }))
    : (edits.products ?? styleData.products ?? defaultProducts)
  const productCards = products.map((product: EditableProduct, index: number) => toCard(product, index))

  return (
    <section
      data-component="products"
      className="py-6 sm:py-8 md:py-12 px-4 sm:px-6"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto">
        <h2
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[51px] font-inter font-normal mb-4 sm:mb-6 md:mb-8"
          style={{ color: textColor || "var(--foreground)" }}
        >
          {title}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {productCards.map((product) => (
            <VisualProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )
}
