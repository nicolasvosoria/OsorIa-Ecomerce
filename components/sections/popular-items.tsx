"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useLanguage } from "@/contexts/language-context"
import { VisualProductCardImage } from "@/components/products/visual-product-card-image"
import { formatCommercePrice } from "@/lib/products/pricing"
import { getPopularCategoryTiles } from "@/lib/products/popular-sections"
import type { PopularCategoryTile } from "@/lib/products/popular-sections"

interface PopularItemsProps {
  initialTiles?: PopularCategoryTile[]
}

export const POPULAR_DEFAULTS = {
  title: "Lo más vendido",
  buttonColor: "",
}

export function PopularItems({ initialTiles }: PopularItemsProps = {}) {
  const { styles: styleData } = useComponentStyle("popular", POPULAR_DEFAULTS)
  const { componentEdits } = useAdmin()
  const { t } = useLanguage()

  const edits = componentEdits.get("popular") || {}
  const title = edits.title ?? styleData.title ?? POPULAR_DEFAULTS.title
  const configuredPriceLabel = edits.priceLabel ?? styleData.priceLabel
  const bgColor = edits.bgColor ?? styleData.bgColor
  const textColor = edits.textColor ?? styleData.textColor
  const buttonColor =
    (edits.buttonColor ?? styleData.buttonColor) || "var(--sec-popular-button, var(--primary))"

  // El live homepage pasa initialTiles (vía PopularItemsWrapper). El editor no
  // pasa props, así que el preview busca las MISMAS categorías directamente
  // con la misma función — esto es lo que mantiene editor y live sincronizados.
  const [fetchedTiles, setFetchedTiles] = useState<PopularCategoryTile[]>([])

  useEffect(() => {
    if (initialTiles) return

    let active = true
    getPopularCategoryTiles()
      .then((tiles) => {
        if (active) setFetchedTiles(tiles)
      })
      .catch((error) => {
        console.error("Error fetching popular category tiles:", error)
      })

    return () => {
      active = false
    }
  }, [initialTiles])

  const tiles = initialTiles ?? fetchedTiles

  // El header muestra un único "Desde $X" con el precio más bajo entre todas
  // las categorías, igual que la referencia ("Popular Items ... Starting at $29").
  // Un admin puede fijar una etiqueta propia desde el editor; si no la configura,
  // se calcula automáticamente a partir del precio más bajo entre las categorías.
  const computedPriceLabel = useMemo(() => {
    const amounts = tiles
      .map((tile) => tile.startingPriceAmount)
      .filter((amount): amount is number => amount !== undefined)
    if (amounts.length === 0) return ""
    return `Desde ${formatCommercePrice(Math.min(...amounts))}`
  }, [tiles])
  const headerPriceLabel = configuredPriceLabel || computedPriceLabel

  if (tiles.length === 0) return null

  return (
    <section
      data-component="popular"
      className="py-8 md:py-12 px-4"
      style={{
        ...(bgColor && { backgroundColor: bgColor }),
        ...(textColor && { color: textColor }),
      }}
    >
      <div className="container mx-auto">
        <div className="mb-6 md:mb-8 flex flex-wrap items-baseline justify-between gap-2">
          <h2
            className="font-heading font-normal text-[35px] sm:text-[44px] md:text-[49px] lg:text-[58px] leading-tight"
            style={{ color: textColor || "var(--foreground)" }}
          >
            {title}
          </h2>
          {headerPriceLabel ? (
            <p
              data-testid="popular-items-starting-price"
              className="font-inter text-base sm:text-lg md:text-[21px]"
              style={{ color: textColor || "var(--foreground)" }}
            >
              {headerPriceLabel}
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tiles.map((tile) => (
            <Link
              key={tile.id}
              href={tile.href}
              className="group relative block aspect-[6/5] overflow-hidden rounded-card bg-muted"
            >
              <VisualProductCardImage src={tile.imageUrl} alt={tile.name} title={tile.name} isOverlay />

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-[30px] text-center [text-shadow:0_2px_10px_rgba(0,0,0,0.55)]">
                <h3 className="font-heading font-normal text-white text-[24px] sm:text-[30px] md:text-[34px] lg:text-[40px] leading-tight">
                  {tile.name}
                </h3>
                {tile.startingPriceLabel ? (
                  <p className="font-inter text-white text-[13px] sm:text-[16px] md:text-[18px] lg:text-[21px]">
                    {tile.startingPriceLabel}
                  </p>
                ) : null}
                <span
                  className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-[var(--button-radius)] px-5 text-base font-inter font-medium opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100"
                  style={{
                    backgroundColor: buttonColor,
                    color: "var(--primary-foreground)",
                  }}
                >
                  {t.wishlist.viewDetails}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
