"use client"

import { useEffect, useState } from "react"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { VisualProductCard } from "@/components/products/visual-product-card"
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers"
import { isToggleOn } from "@/lib/section-editor/toggle-value"
import {
  PRODUCTS_COLUMNS_CLASS,
  resolveCardStyle,
  resolveHoverEffect,
  resolveItemCount,
  resolveProductsColumns,
} from "@/lib/sections/products-variant"
import { PRODUCTS_RADIUS_CLASS } from "@/lib/theme/section-style-keys"
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
  mediaPosition: "bottom",
  showCta: false,
  showDescription: false,
  itemCount: "4",
  cardStyle: "shadow",
  hoverEffect: "lift",
}

// Matches VisualProductCard's own default `radiusClass` byte-for-byte: when
// no per-section override is set, this section's cards still land on the
// exact same corner radius as before this section gained a theme fallback.
const DEFAULT_CARD_RADIUS_CLASS =
  "rounded-[var(--sec-products-corner-radius,var(--card-radius,1.5rem))]"

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
    mediaPosition: rawMediaPosition,
    showCta,
    showDescription,
    itemCount: rawItemCount,
    cardStyle: rawCardStyle,
    hoverEffect: rawHoverEffect,
  } = {
    ...PRODUCTS_DEFAULTS,
    ...styleData,
    ...edits,
  }

  const columnsClass = PRODUCTS_COLUMNS_CLASS[resolveProductsColumns(columns)]
  const radiusClass = cornerRadius
    ? PRODUCTS_RADIUS_CLASS[cornerRadius]
    : DEFAULT_CARD_RADIUS_CLASS
  const mediaPosition = rawMediaPosition === "top" ? "top" : "bottom"
  const itemCount = resolveItemCount(rawItemCount)
  const cardStyle = resolveCardStyle(rawCardStyle)
  const hoverEffect = resolveHoverEffect(rawHoverEffect)

  // Un edit efímero (solo-preview, sin publicar) que cambia QUÉ productos se
  // muestran nunca refleja en el preview si nos quedamos con initialProducts
  // (pasados por el servidor antes del edit): itemCount/selectionMode
  // cambian qué se pide, no cómo se renderiza, así que necesitan un fetch
  // nuevo para tener efecto en el preview.
  const hasEphemeralDataEdit = edits.itemCount !== undefined || edits.selectionMode !== undefined

  // El live homepage pasa initialProducts (vía ProductsGridWrapper), usando
  // getPopularProductCards() directamente en el servidor. El editor no pasa
  // props, así que el preview pide los MISMOS productos a la ruta admin
  // (que llama a la misma función bajo una sesión autenticada) — esto es lo
  // que mantiene editor y live sincronizados. También se pide de nuevo
  // (aunque haya initialProducts) cuando hay un edit efímero de datos, para
  // que el preview refleje itemCount/selectionMode sin necesidad de "Aplicar".
  const [fetchedProducts, setFetchedProducts] = useState<CommerceProductCard[]>([])

  useEffect(() => {
    if (initialProducts && !hasEphemeralDataEdit) return

    let active = true

    async function loadPreviewProducts() {
      try {
        const headers = await getAdminRequestHeaders()
        const response = await fetch(
          `/api/admin/popular-products?mode=${selectionMode}&limit=${itemCount}`,
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
  }, [initialProducts, hasEphemeralDataEdit, selectionMode, itemCount])

  const products = hasEphemeralDataEdit ? fetchedProducts : (initialProducts ?? fetchedProducts)

  if (products.length === 0) return null

  return (
    <section
      data-component="products"
      className="px-4 py-10 sm:px-6 md:py-16"
      style={{
        backgroundColor: bgColor || "var(--sec-products-bg,transparent)",
        color: textColor || "var(--sec-products-text,var(--foreground))",
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
              style={{ color: textColor || "var(--sec-products-text,var(--foreground))" }}
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
              showDescription={showDescription}
              showCta={showCta}
              mediaPosition={mediaPosition}
              cardBackground={cardBgColor || "var(--sec-products-card-bg,var(--muted))"}
              priceColor={priceColor || "var(--sec-products-price,var(--primary))"}
              radiusClass={radiusClass}
              imageBlendsWithCard
              showCategory={isToggleOn(showCategory)}
              showPrice={isToggleOn(showPrice)}
              cardStyle={cardStyle}
              hoverEffect={hoverEffect}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
