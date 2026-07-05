"use client"

import { useEffect, useState } from "react"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { VisualProductCard } from "@/components/products/visual-product-card"
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers"
import type { CommerceProductCard } from "@/lib/types/products"

interface ProductsGridProps {
  initialProducts?: CommerceProductCard[]
}

export const PRODUCTS_DEFAULTS = {
  title: "Productos populares",
  eyebrow: "Electrónica",
  description: "Descubrí los productos más buscados, seleccionados de nuestro catálogo destacado.",
  // Empty by default: the section follows the active theme (transparent
  // background, --foreground heading, text-primary price). Setting any of
  // these fields overrides it per section.
  bgColor: "",
  textColor: "",
  cardBgColor: "",
  cornerRadius: "",
  priceColor: "",
  columns: "4",
  showCategory: "si",
  showPrice: "si",
  selectionMode: "display_order",
}

const COLUMNS_CLASS: Record<string, string> = {
  "2": "sm:grid-cols-2",
  "3": "sm:grid-cols-2 lg:grid-cols-3",
  "4": "sm:grid-cols-2 lg:grid-cols-4",
}

const RADIUS_CLASS: Record<string, string> = {
  none: "rounded-none",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
}

export function ProductsGrid({ initialProducts }: ProductsGridProps = {}) {
  const { styles: styleData } = useComponentStyle("products", PRODUCTS_DEFAULTS)
  const { componentEdits } = useAdmin()

  const edits = componentEdits.get("products") || {}
  const {
    title,
    eyebrow,
    description,
    bgColor,
    textColor,
    cardBgColor,
    cornerRadius,
    priceColor,
    columns,
    showCategory,
    showPrice,
    selectionMode,
  } = {
    ...PRODUCTS_DEFAULTS,
    ...styleData,
    ...edits,
  }

  const columnsClass = COLUMNS_CLASS[columns] || COLUMNS_CLASS["4"]
  const radiusClass = cornerRadius ? RADIUS_CLASS[cornerRadius] : undefined

  // El live homepage pasa initialProducts (vía ProductsGridWrapper), usando
  // getPopularProductCards() directamente en el servidor. El editor no pasa
  // props, así que el preview pide los MISMOS productos a la ruta admin
  // (que llama a la misma función bajo una sesión autenticada) — esto es lo
  // que mantiene editor y live sincronizados.
  const [fetchedProducts, setFetchedProducts] = useState<CommerceProductCard[]>([])

  useEffect(() => {
    if (initialProducts) return

    let active = true

    async function loadPreviewProducts() {
      try {
        const headers = await getAdminRequestHeaders()
        const response = await fetch(
          `/api/admin/popular-products?mode=${selectionMode}&limit=4`,
          { headers },
        )

        if (!response.ok) {
          throw new Error("No se pudieron cargar los productos populares")
        }

        const payload = (await response.json()) as { products?: CommerceProductCard[] }
        if (active) setFetchedProducts(payload.products ?? [])
      } catch (error) {
        console.error("Error fetching popular products:", error)
      }
    }

    loadPreviewProducts()

    return () => {
      active = false
    }
  }, [initialProducts, selectionMode])

  const products = initialProducts ?? fetchedProducts

  if (products.length === 0) return null

  return (
    <section
      data-component="products"
      className="px-4 py-10 sm:px-6 md:py-16"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto">
        <div className="mb-8 flex flex-col gap-2 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              {eyebrow}
            </p>
            <h2
              className="text-3xl font-semibold tracking-tight md:text-5xl"
              style={{ color: textColor || "var(--foreground)" }}
            >
              {title}
            </h2>
          </div>
          {description ? (
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
              {description}
            </p>
          ) : null}
        </div>

        <div className={`grid grid-cols-1 gap-4 ${columnsClass}`}>
          {products.map((product) => (
            <VisualProductCard
              key={product.id}
              product={product}
              showDescription={false}
              showCta={false}
              mediaPosition="bottom"
              cardBackground={cardBgColor || undefined}
              priceColor={priceColor || undefined}
              radiusClass={radiusClass}
              imageBlendsWithCard
              showCategory={showCategory === "si"}
              showPrice={showPrice === "si"}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
