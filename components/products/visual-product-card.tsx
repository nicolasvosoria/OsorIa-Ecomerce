import Link from "next/link"
import type { ReactNode } from "react"
import { VisualProductCardImage } from "@/components/products/visual-product-card-image"
import type { CommerceProductBadge, CommerceProductCard } from "@/lib/types/products"

interface VisualProductCardProps {
  product: CommerceProductCard
  variant?: "grid" | "compact" | "overlay"
  showCta?: boolean
  favoriteSlot?: ReactNode
  actionSlot?: ReactNode
  className?: string
}

const badgeToneClass: Record<NonNullable<CommerceProductBadge["tone"]>, string> = {
  default: "bg-primary text-primary-foreground",
  sale: "bg-destructive text-white",
  combo: "bg-primary text-primary-foreground",
}

export function VisualProductCard({
  product,
  variant = "grid",
  showCta = true,
  favoriteSlot,
  actionSlot,
  className = "",
}: VisualProductCardProps) {
  const isOverlay = variant === "overlay"
  const imageAlt = product.imageAlt || product.title

  return (
    <article
      className={`group relative overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl focus-within:ring-2 focus-within:ring-primary/50 ${className}`}
    >
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

      {favoriteSlot ? (
        <div className="absolute right-3 top-3 z-20">{favoriteSlot}</div>
      ) : null}

      <Link
        href={product.href}
        className="block focus-visible:outline-none"
        aria-label={`Ver ${product.title}`}
      >
        <div
          className={`${isOverlay ? "aspect-[4/3]" : "aspect-square"} flex items-center justify-center bg-background p-4`}
        >
          <VisualProductCardImage
            src={product.imageUrl}
            alt={imageAlt}
            title={product.title}
            isOverlay={isOverlay}
          />
        </div>
      </Link>

      <div className="space-y-3 p-4 sm:p-5">
        {product.category ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {product.category}
          </p>
        ) : null}

        <Link href={product.href} className="block focus-visible:outline-none">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug transition-colors hover:text-primary md:text-lg">
            {product.title}
          </h3>
        </Link>

        {product.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {product.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-xl font-bold text-primary">{product.price.label}</span>
          {product.price.compareAtLabel ? (
            <span className="text-sm font-medium text-muted-foreground line-through">
              {product.price.compareAtLabel}
            </span>
          ) : null}
        </div>

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
    </article>
  )
}
