"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { useLanguage } from "@/contexts/language-context"
import { VisualProductCardImage } from "@/components/products/visual-product-card-image"
import { formatCommercePrice } from "@/lib/products/pricing"
import type { PopularCategoryTile } from "@/lib/products/popular-sections"
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers"
import { isToggleOn } from "@/lib/section-editor/toggle-value"
import {
  POPULAR_COLUMNS_CLASS,
  POPULAR_MOSAIC_FIRST_ITEM_CLASS,
  POPULAR_OVERLAY_CONTAINER_CLASS,
  POPULAR_OVERLAY_CTA_CLASS,
  POPULAR_OVERLAY_PRICE_CLASS,
  POPULAR_OVERLAY_TITLE_CLASS,
  POPULAR_TILE_ASPECT_CLASS,
  resolveCategoryTilesOverride,
  resolveGridLayout,
  resolvePopularColumns,
  resolveTextPlacement,
  resolveTileAspect,
} from "@/lib/sections/popular-variant"

interface PopularItemsProps {
  initialTiles?: PopularCategoryTile[]
}

export const POPULAR_DEFAULTS = {
  title: "Lo más vendido",
  buttonColor: "",
  columns: "2",
  tileAspect: "actual",
  textPlacement: "overlay",
  showStartingPrice: true,
  gridLayout: "uniform",
  categoryTiles: [],
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
  const columns = resolvePopularColumns(edits.columns ?? styleData.columns ?? POPULAR_DEFAULTS.columns)
  const tileAspect = resolveTileAspect(edits.tileAspect ?? styleData.tileAspect ?? POPULAR_DEFAULTS.tileAspect)
  const textPlacement = resolveTextPlacement(
    edits.textPlacement ?? styleData.textPlacement ?? POPULAR_DEFAULTS.textPlacement,
  )
  const showStartingPrice = isToggleOn(
    edits.showStartingPrice ?? styleData.showStartingPrice ?? POPULAR_DEFAULTS.showStartingPrice,
  )
  const gridLayout = resolveGridLayout(edits.gridLayout ?? styleData.gridLayout ?? POPULAR_DEFAULTS.gridLayout)

  const columnsClass = POPULAR_COLUMNS_CLASS[columns]
  const tileAspectClass = POPULAR_TILE_ASPECT_CLASS[tileAspect]
  const mosaicFirstItemClass = POPULAR_MOSAIC_FIRST_ITEM_CLASS[gridLayout]
  // Equal row tracks so the mosaic's `row-span-2` first tile aligns cleanly
  // with the two single-span rows next to it, instead of stretching or
  // leaving a trailing gap. Only needed in mosaic mode — uniform stays as-is.
  const mosaicAutoRowsClass = gridLayout === "mosaic" ? "auto-rows-fr" : ""
  const overlayContainerClass = POPULAR_OVERLAY_CONTAINER_CLASS[columns]
  const overlayTitleClass = POPULAR_OVERLAY_TITLE_CLASS[columns]
  const overlayPriceClass = POPULAR_OVERLAY_PRICE_CLASS[columns]
  const overlayCtaClass = POPULAR_OVERLAY_CTA_CLASS[columns]
  // The mosaic's first tile renders 2x2 (via col/row span), so it should use
  // the columns=2 overlay sizing regardless of the chosen `columns` value —
  // not the shrunken 3/4-column text meant for a single-cell tile.
  const mosaicFirstOverlayContainerClass = POPULAR_OVERLAY_CONTAINER_CLASS["2"]
  const mosaicFirstOverlayTitleClass = POPULAR_OVERLAY_TITLE_CLASS["2"]
  const mosaicFirstOverlayPriceClass = POPULAR_OVERLAY_PRICE_CLASS["2"]
  const mosaicFirstOverlayCtaClass = POPULAR_OVERLAY_CTA_CLASS["2"]

  // Serializado a una key estable para no disparar el efecto de abajo en cada
  // render (edits/styleData entregan un array nuevo aunque el contenido no
  // haya cambiado), mismo patrón que `useComponentStyle` usa para sus defaults.
  const categoryTilesKey = JSON.stringify(
    edits.categoryTiles ?? styleData.categoryTiles ?? POPULAR_DEFAULTS.categoryTiles,
  )
  const categoryTilesOverride = useMemo(
    () => resolveCategoryTilesOverride(JSON.parse(categoryTilesKey)),
    [categoryTilesKey],
  )

  // Un edit efímero (solo-preview, sin publicar) de `categoryTiles` (qué
  // categorías se eligieron y sus imágenes) nunca refleja en el preview si
  // nos quedamos con initialTiles (pasadas por el servidor antes del edit),
  // así que necesita un fetch nuevo para tener efecto.
  const hasEphemeralDataEdit = edits.categoryTiles !== undefined

  // El live homepage pasa initialTiles (vía PopularItemsWrapper), usando
  // getPopularCategoryTiles() directamente en el servidor. El editor no pasa
  // props, así que el preview pide las MISMAS categorías a la ruta admin
  // (que llama a la misma función bajo una sesión autenticada) — esto es lo
  // que mantiene editor y live sincronizados. También se pide de nuevo
  // (aunque haya initialTiles) cuando hay un edit efímero de categoryTiles,
  // para que el preview lo refleje sin necesidad de "Aplicar".
  const [fetchedTiles, setFetchedTiles] = useState<PopularCategoryTile[]>([])

  useEffect(() => {
    if (initialTiles && !hasEphemeralDataEdit) return

    let active = true

    async function loadPreviewTiles() {
      try {
        const headers = await getAdminRequestHeaders()
        const response = await fetch(
          `/api/admin/popular-category-tiles?categoryTiles=${encodeURIComponent(
            JSON.stringify(categoryTilesOverride),
          )}`,
          { headers },
        )

        if (!response.ok) {
          throw new Error("No se pudieron cargar las categorías populares")
        }

        const payload = (await response.json()) as { tiles?: PopularCategoryTile[] }
        if (active) setFetchedTiles(payload.tiles ?? [])
      } catch (error) {
        console.error("Error fetching popular category tiles:", error)
      }
    }

    loadPreviewTiles()

    return () => {
      active = false
    }
  }, [initialTiles, hasEphemeralDataEdit, categoryTilesOverride])

  const tiles = hasEphemeralDataEdit ? fetchedTiles : (initialTiles ?? fetchedTiles)

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

        <div className={`grid grid-cols-1 gap-3 ${mosaicAutoRowsClass} ${columnsClass}`}>
          {tiles.map((tile, index) => {
            const isMosaicFirstTile = gridLayout === "mosaic" && index === 0
            const mosaicClass = index === 0 ? mosaicFirstItemClass : ""
            const showTilePrice = showStartingPrice && Boolean(tile.startingPriceLabel)
            const tileOverlayContainerClass = isMosaicFirstTile
              ? mosaicFirstOverlayContainerClass
              : overlayContainerClass
            const tileOverlayTitleClass = isMosaicFirstTile ? mosaicFirstOverlayTitleClass : overlayTitleClass
            const tileOverlayPriceClass = isMosaicFirstTile ? mosaicFirstOverlayPriceClass : overlayPriceClass
            const tileOverlayCtaClass = isMosaicFirstTile ? mosaicFirstOverlayCtaClass : overlayCtaClass

            if (textPlacement === "below") {
              return (
                <Link
                  key={tile.id}
                  href={tile.href}
                  className={`group flex flex-col overflow-hidden rounded-card bg-muted ${mosaicClass}`}
                >
                  <div className={`relative block ${tileAspectClass} overflow-hidden`}>
                    <VisualProductCardImage src={tile.imageUrl} alt={tile.name} title={tile.name} isOverlay />
                  </div>

                  <div className="flex flex-col items-center gap-2 p-[20px] text-center">
                    <h3 className="font-heading font-normal text-[24px] sm:text-[30px] md:text-[34px] lg:text-[40px] leading-tight">
                      {tile.name}
                    </h3>
                    {showTilePrice ? (
                      <p className="font-inter text-[13px] sm:text-[16px] md:text-[18px] lg:text-[21px]">
                        {tile.startingPriceLabel}
                      </p>
                    ) : null}
                    <span
                      className="mt-2 inline-flex min-h-[44px] items-center justify-center rounded-[var(--button-radius)] px-5 text-base font-inter font-medium"
                      style={{
                        backgroundColor: buttonColor,
                        color: "var(--primary-foreground)",
                      }}
                    >
                      {t.wishlist.viewDetails}
                    </span>
                  </div>
                </Link>
              )
            }

            return (
              <Link
                key={tile.id}
                href={tile.href}
                className={`group relative block ${tileAspectClass} overflow-hidden rounded-card bg-muted ${mosaicClass}`}
              >
                <VisualProductCardImage src={tile.imageUrl} alt={tile.name} title={tile.name} isOverlay />

                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center text-center [text-shadow:0_2px_10px_rgba(0,0,0,0.55)] ${tileOverlayContainerClass}`}
                >
                  <h3 className={`font-heading font-normal text-white ${tileOverlayTitleClass}`}>
                    {tile.name}
                  </h3>
                  {showTilePrice ? (
                    <p className={`font-inter text-white ${tileOverlayPriceClass}`}>
                      {tile.startingPriceLabel}
                    </p>
                  ) : null}
                  <span
                    className={`inline-flex items-center justify-center rounded-[var(--button-radius)] font-inter font-medium opacity-100 transition-opacity duration-200 md:opacity-0 md:group-hover:opacity-100 md:group-focus-visible:opacity-100 ${tileOverlayCtaClass}`}
                    style={{
                      backgroundColor: buttonColor,
                      color: "var(--primary-foreground)",
                    }}
                  >
                    {t.wishlist.viewDetails}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
