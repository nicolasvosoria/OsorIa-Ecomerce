"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { VisualProductCardImage } from "@/components/products/visual-product-card-image"
import { useHydratedProductCard } from "@/lib/products/use-hydrated-product-card"
import type { CommerceProductCard } from "@/lib/types/products"
import {
  resolveFeaturedImageSide,
  resolveContentWidth,
  resolveTextAlign,
  resolveFeaturedSectionHeight,
  resolveFeaturedBackgroundMode,
  resolveFeaturedContentAlign,
  resolveFeaturedCtaStyle,
  FEATURED_IMAGE_SIDE_CONTENT_CLASS,
  FEATURED_IMAGE_SIDE_BG_POSITION,
  FEATURED_CONTENT_WIDTH_CLASS,
  FEATURED_TEXT_ALIGN_CLASS,
  FEATURED_TEXT_ALIGN_ITEM_CLASS,
  FEATURED_SECTION_HEIGHT_CLASS,
  FEATURED_CONTENT_ALIGN_WRAPPER_CLASS,
  FEATURED_CONTENT_ALIGN_ITEM_CLASS,
  type FeaturedCtaStyle,
} from "@/lib/sections/featured-variant"

export const FEATURED_DEFAULTS = {
  title: "¡Por favor, no detengas la música!",
  subtitle: "La elección de los usuarios esta semana",
  productId: "",
  linkText: "Ver todos los productos",
  linkHref: "/shop",
  mainImage: "/woman-wearing-headphones-smiling.jpg",
  bgColor: "",
  textColor: "",
  cardBgColor: "",
  productBgColor: "",
  imageSide: "right",
  contentWidth: "balanced",
  textAlign: "left",
  sectionHeight: "standard",
  backgroundMode: "image",
  contentAlign: "left",
  ctaStyle: "link",
  overlayColor: "#0f172a",
  overlayOpacity: 0.45,
}

// `fullImage` is the only mode that renders an overlay, so an invalid or
// missing value here has no visible effect elsewhere — clamped the same way
// `newsletter-section.tsx`'s `clampOverlayOpacity` guards its own overlay.
function clampFeaturedOverlayOpacity(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.min(Math.max(numeric, 0), 1) : FEATURED_DEFAULTS.overlayOpacity
}

export function FeaturedProduct() {
  const { styles: styleData } = useComponentStyle("featured", FEATURED_DEFAULTS)
  const { componentEdits, isEditMode } = useAdmin()

  const edits = componentEdits.get("featured") || {}
  const featured = { ...FEATURED_DEFAULTS, ...styleData, ...edits }

  const panelBg = featured.bgColor || "var(--sec-featured-bg, var(--secondary))"
  const cardBg = featured.cardBgColor || "var(--sec-featured-card-bg, var(--card))"
  const productBg = featured.productBgColor || "var(--sec-featured-product-bg, var(--muted))"
  const textColor = featured.textColor || "var(--sec-featured-text, var(--secondary-foreground))"

  const imageSide = resolveFeaturedImageSide(featured.imageSide)
  const contentWidth = resolveContentWidth(featured.contentWidth)
  const textAlign = resolveTextAlign(featured.textAlign)
  const sectionHeight = resolveFeaturedSectionHeight(featured.sectionHeight)
  const backgroundMode = resolveFeaturedBackgroundMode(featured.backgroundMode)
  const contentAlign = resolveFeaturedContentAlign(featured.contentAlign)
  const ctaStyle = resolveFeaturedCtaStyle(featured.ctaStyle)

  const imageAnchorClass = FEATURED_IMAGE_SIDE_CONTENT_CLASS[imageSide]
  const bgPosition = FEATURED_IMAGE_SIDE_BG_POSITION[imageSide]
  const contentWidthClass = FEATURED_CONTENT_WIDTH_CLASS[contentWidth]
  const textAlignClass = FEATURED_TEXT_ALIGN_CLASS[textAlign]
  const sectionHeightClass = FEATURED_SECTION_HEIGHT_CLASS[sectionHeight]

  // `image` mode keeps anchoring the content block against `imageSide` via
  // `textAlign`; `color`/`fullImage` have no lateral image to anchor
  // against, so they align against `contentAlign` instead.
  const itemAlignClass =
    backgroundMode === "image"
      ? FEATURED_TEXT_ALIGN_ITEM_CLASS[textAlign]
      : FEATURED_CONTENT_ALIGN_ITEM_CLASS[contentAlign]

  const { card } = useHydratedProductCard(featured.productId)
  const originalPrice =
    card && card.price.hasDiscount ? (card.price.compareAtLabel ?? null) : null

  const titleBlock = (
    <div>
      <h2 className="mb-3 font-heading text-4xl font-normal leading-tight md:text-5xl lg:text-[52px]">
        {featured.title}
      </h2>
      <p className="text-lg font-normal md:text-xl lg:text-[22px]" style={{ opacity: 0.9 }}>
        {featured.subtitle}
      </p>
    </div>
  )

  const productBlock = (
    <FeaturedProductBlock
      card={card}
      isEditMode={isEditMode}
      cardBg={cardBg}
      productBg={productBg}
      originalPrice={originalPrice}
      itemAlignClass={itemAlignClass}
    />
  )

  const ctaButton = (
    <FeaturedCtaButton
      ctaStyle={ctaStyle}
      href={featured.linkHref || "/shop"}
      label={featured.linkText}
      textColor={textColor}
      panelBg={panelBg}
      itemAlignClass={itemAlignClass}
    />
  )

  if (backgroundMode === "color") {
    return (
      <section
        data-component="featured"
        className={`relative overflow-hidden rounded-card mx-2 md:mx-4 my-4 md:my-8 flex items-center ${sectionHeightClass}`}
        style={{ backgroundColor: panelBg, color: textColor }}
      >
        <div className="container mx-auto px-4 py-10 md:py-14">
          <div
            className={`mx-auto flex w-full max-w-2xl flex-col gap-8 ${FEATURED_CONTENT_ALIGN_WRAPPER_CLASS[contentAlign]}`}
          >
            {titleBlock}
            {productBlock}
            {ctaButton}
          </div>
        </div>
      </section>
    )
  }

  if (backgroundMode === "fullImage") {
    const overlayOpacity = clampFeaturedOverlayOpacity(featured.overlayOpacity)

    return (
      <section
        data-component="featured"
        className={`relative overflow-hidden rounded-card mx-2 md:mx-4 my-4 md:my-8 flex items-center ${sectionHeightClass}`}
        style={{
          backgroundColor: panelBg,
          backgroundImage: `url(${featured.mainImage || "/placeholder.svg"})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "cover",
          color: textColor,
        }}
      >
        <div
          className="absolute inset-0"
          style={{ backgroundColor: featured.overlayColor, opacity: overlayOpacity }}
        />
        <div className="container relative z-10 mx-auto px-4 py-10 md:py-14">
          <div
            className={`mx-auto flex w-full max-w-2xl flex-col gap-8 ${FEATURED_CONTENT_ALIGN_WRAPPER_CLASS[contentAlign]}`}
          >
            {titleBlock}
            {productBlock}
            {ctaButton}
          </div>
        </div>
      </section>
    )
  }

  return (
    // La imagen lifestyle es el fondo de la sección (anclada según
    // `imageSide`), igual que en la referencia; el contenido vive en una
    // columna que flota encima del fondo, del lado opuesto a la imagen.
    <section
      data-component="featured"
      className={`relative overflow-hidden rounded-card mx-2 md:mx-4 my-4 md:my-8 flex items-center ${sectionHeightClass}`}
      style={{
        backgroundColor: panelBg,
        backgroundImage: `url(${featured.mainImage || "/placeholder.svg"})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: bgPosition,
        backgroundSize: "contain",
        color: textColor,
      }}
    >
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div
          className={`${imageAnchorClass} flex w-full flex-col gap-8 text-center ${contentWidthClass} ${textAlignClass}`}
        >
          {titleBlock}
          {productBlock}
          {ctaButton}
        </div>
      </div>
    </section>
  )
}

// Card de producto compacta (texto arriba, imagen abajo); sale únicamente
// del producto elegido. Sin producto: en el editor se muestra un
// placeholder que guía al admin, y en vivo no se renderiza ninguna card
// (nunca datos falsos al cliente).
function FeaturedProductBlock({
  card,
  isEditMode,
  cardBg,
  productBg,
  originalPrice,
  itemAlignClass,
}: {
  card: CommerceProductCard | null
  isEditMode: boolean
  cardBg: string
  productBg: string
  originalPrice: string | null
  itemAlignClass: string
}) {
  if (card) {
    return (
      <Link href={card.href} className={`mx-auto block w-full max-w-lg ${itemAlignClass}`}>
        <div
          className="cursor-pointer rounded-card border border-[var(--border)] p-6 text-left shadow-[var(--shadow-card,none)] transition-shadow hover:shadow-[var(--shadow-elevated,none)] md:p-8"
          style={{
            backgroundColor: cardBg,
            color: "var(--card-foreground)",
          }}
        >
          <h3
            className="text-lg font-semibold transition-colors hover:text-primary md:text-xl"
            style={{ color: "var(--card-foreground)" }}
          >
            {card.title}
          </h3>
          <p
            className="mt-1 text-sm uppercase tracking-wide md:text-base"
            style={{ color: "var(--muted-foreground)" }}
          >
            {card.category ?? ""}
          </p>
          <div className="mb-5 mt-4 flex items-baseline gap-2">
            {originalPrice ? (
              <span className="text-base line-through md:text-lg" style={{ color: "var(--muted-foreground)" }}>
                {originalPrice}
              </span>
            ) : null}
            <span className="text-lg font-normal md:text-xl" style={{ color: "var(--card-foreground)" }}>
              {card.price.label}
            </span>
          </div>
          <div
            className="flex aspect-square items-center justify-center rounded-card"
            style={{ backgroundColor: productBg }}
          >
            <VisualProductCardImage src={card.imageUrl} alt={card.title} title={card.title} isOverlay={false} />
          </div>
        </div>
      </Link>
    )
  }

  if (!isEditMode) return null

  return (
    <div className={`mx-auto block w-full max-w-lg ${itemAlignClass}`}>
      <div
        className="rounded-card border border-[var(--border)] p-6 text-left shadow-[var(--shadow-card,none)] md:p-8"
        style={{
          backgroundColor: cardBg,
          color: "var(--card-foreground)",
        }}
      >
        <p className="text-sm md:text-base" style={{ color: "var(--muted-foreground)" }}>
          Elegí un producto del catálogo para mostrarlo acá
        </p>
        <div
          className="mt-4 flex aspect-square items-center justify-center rounded-card"
          style={{ backgroundColor: productBg }}
        >
          <VisualProductCardImage
            alt="Producto destacado sin elegir"
            title="Producto destacado sin elegir"
            isOverlay={false}
          />
        </div>
      </div>
    </div>
  )
}

// `link` reproduces today's hardcoded CTA (text link, arrow, JS-driven hover
// opacity); `solid`/`outline` render an actual button, inverting/bordering
// against the panel's own colors so they read correctly on any theme.
function FeaturedCtaButton({
  ctaStyle,
  href,
  label,
  textColor,
  panelBg,
  itemAlignClass,
}: {
  ctaStyle: FeaturedCtaStyle
  href: string
  label: string
  textColor: string
  panelBg: string
  itemAlignClass: string
}) {
  if (ctaStyle === "solid") {
    return (
      <Button
        className={`mx-auto flex min-h-[44px] w-fit items-center gap-2 touch-manipulation ${itemAlignClass}`}
        style={{ backgroundColor: textColor, color: panelBg }}
        asChild
      >
        <Link href={href}>
          {label} <span aria-hidden>→</span>
        </Link>
      </Button>
    )
  }

  if (ctaStyle === "outline") {
    return (
      <Button
        variant="outline"
        className={`mx-auto flex min-h-[44px] w-fit items-center gap-2 touch-manipulation ${itemAlignClass}`}
        style={{ borderColor: textColor, color: textColor, backgroundColor: "transparent" }}
        asChild
      >
        <Link href={href}>
          {label} <span aria-hidden>→</span>
        </Link>
      </Button>
    )
  }

  return (
    <Button
      variant="link"
      className={`mx-auto flex min-h-[44px] w-fit items-center gap-2 p-0 touch-manipulation ${itemAlignClass}`}
      style={{ color: textColor }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
      asChild
    >
      <Link href={href}>
        {label} <span aria-hidden>→</span>
      </Link>
    </Button>
  )
}
