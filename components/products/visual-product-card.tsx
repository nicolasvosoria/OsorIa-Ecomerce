import Link from "next/link"
import type { ReactNode } from "react"
import { VisualProductCardImage } from "@/components/products/visual-product-card-image"
import type { CommerceProductBadge, CommerceProductCard } from "@/lib/types/products"

interface VisualProductCardProps {
  product: CommerceProductCard
  variant?: "grid" | "compact" | "overlay"
  showCta?: boolean
  showDescription?: boolean
  /** "bottom" matches the reference's Popular Products card (text first, image below). Defaults to the catalog's image-first layout. */
  mediaPosition?: "top" | "bottom"
  favoriteSlot?: ReactNode
  actionSlot?: ReactNode
  className?: string
  /** Inline background color for the card. Falls back to `bg-muted` when undefined. */
  cardBackground?: string
  /** Inline color for the price. Falls back to `text-primary` when undefined. */
  priceColor?: string
  radiusClass?: string
  /** When true, the media container blends into the card background instead of using `bg-background`. */
  imageBlendsWithCard?: boolean
  showCategory?: boolean
  showPrice?: boolean
}

const badgeToneClass: Record<NonNullable<CommerceProductBadge["tone"]>, string> = {
  default: "bg-primary text-primary-foreground",
  sale: "bg-destructive text-destructive-foreground",
  combo: "bg-primary text-primary-foreground",
}

export function VisualProductCard({
  product,
  variant = "grid",
  showCta = true,
  showDescription = true,
  mediaPosition = "top",
  favoriteSlot,
  actionSlot,
  className = "",
  cardBackground,
  priceColor,
  radiusClass = "rounded-card",
  imageBlendsWithCard = false,
  showCategory = true,
  showPrice = true,
}: VisualProductCardProps) {
  const isOverlay = variant === "overlay"
  const imageAlt = product.imageAlt || product.title

  const media = (
    <div className="relative">
      <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
        {product.badges.map((badge) => (
          <span
            key={`${badge.tone || "default"}-${badge.label}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide shadow-sm ${badgeToneClass[badge.tone || "default"]}`}
          >
            {badge.label}
          </span>
        ))}
      </div>

      {favoriteSlot ? <div className="absolute right-3 top-3 z-20">{favoriteSlot}</div> : null}

      <Link
        href={product.href}
        className="block focus-visible:outline-none"
        aria-label={`Ver ${product.title}`}
      >
        <div
          className={`${isOverlay ? "aspect-[4/3]" : "aspect-square"} flex items-center justify-center p-4 ${imageBlendsWithCard ? "" : "bg-background"}`}
        >
          <VisualProductCardImage
            src={product.imageUrl}
            alt={imageAlt}
            title={product.title}
            isOverlay={isOverlay}
          />
        </div>
      </Link>
    </div>
  )

  return (
    <article
      className={`group relative overflow-hidden ${radiusClass} shadow-[var(--shadow-card,none)] ${cardBackground ? "" : "bg-muted"} text-card-foreground transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated,none)] focus-within:ring-2 focus-within:ring-primary/50 ${className}`}
      style={cardBackground ? { backgroundColor: cardBackground } : undefined}
    >
      {mediaPosition === "top" ? media : null}

      <div className="space-y-3 p-4 sm:p-5">
        <Link href={product.href} className="block focus-visible:outline-none">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors hover:text-primary md:text-lg">
            {product.title}
          </h3>
        </Link>

        {showCategory && product.category ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.category}
          </p>
        ) : null}

        {showDescription && product.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        {showPrice ? (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {product.price.compareAtLabel ? (
              <span className="text-sm font-medium text-muted-foreground line-through">
                {product.price.compareAtLabel}
              </span>
            ) : null}
            <span
              className={`text-xl font-bold ${priceColor ? "" : "text-primary"}`}
              style={priceColor ? { color: priceColor } : undefined}
            >
              {product.price.label}
            </span>
          </div>
        ) : null}

        {actionSlot ? <div>{actionSlot}</div> : null}

        {showCta && product.ctaLabel ? (
          <Link
            href={product.href}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {product.ctaLabel}
          </Link>
        ) : null}
      </div>

      {mediaPosition === "bottom" ? media : null}
    </article>
  )
}
