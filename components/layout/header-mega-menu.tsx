"use client"

import Link from "next/link"
import { useHydratedProductCard } from "@/lib/products/use-hydrated-product-card"
import { VisualProductCardImage } from "@/components/products/visual-product-card-image"

interface HeaderMegaMenuProps {
  categoryName: string
  categoryHref: string
  description: string
  viewAllText: string
  featuredProductId: string | null
  bgColor?: string
  textColor?: string
  featuredBgColor?: string
}

export function HeaderMegaMenu({
  categoryName,
  categoryHref,
  description,
  viewAllText,
  featuredProductId,
  bgColor,
  textColor,
  featuredBgColor,
}: HeaderMegaMenuProps) {
  const { card, isLoading } = useHydratedProductCard(featuredProductId ?? "")

  return (
    <div
      className="grid gap-10 rounded-b-2xl border border-t-0 px-8 py-8 shadow-xl md:grid-cols-2 md:px-10"
      style={{ backgroundColor: bgColor || "var(--background)", borderColor: "var(--border)" }}
    >
      <div className="flex flex-col items-start justify-center gap-4">
        <h3 className="text-2xl font-inter font-semibold" style={{ color: textColor || "var(--foreground)" }}>
          {categoryName}
        </h3>
        <p className="max-w-sm text-base leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
        <Link
          href={categoryHref}
          className="rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          {viewAllText}
        </Link>
      </div>

      {isLoading ? (
        <div
          className="flex animate-pulse items-center gap-5 rounded-xl p-5"
          style={{ backgroundColor: featuredBgColor || "var(--muted)" }}
          data-testid="mega-menu-skeleton"
        >
          <div className="h-32 w-32 flex-shrink-0 rounded-lg bg-black/10" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="h-4 w-3/4 rounded bg-black/10" />
            <div className="h-5 w-1/2 rounded bg-black/10" />
          </div>
        </div>
      ) : card ? (
        <Link
          href={card.href}
          className="flex items-center gap-5 rounded-xl p-5 transition-opacity hover:opacity-90"
          style={{ backgroundColor: featuredBgColor || "var(--muted)" }}
        >
          <div className="h-32 w-32 flex-shrink-0">
            <VisualProductCardImage src={card.imageUrl} alt={card.title} title={card.title} />
          </div>
          <div className="flex min-w-0 flex-col gap-2">
            <span className="truncate text-base font-medium" style={{ color: textColor || "var(--foreground)" }}>
              {card.title}
            </span>
            <div className="flex items-center gap-2">
              {card.price.hasDiscount && card.price.compareAtLabel ? (
                <span className="text-sm line-through" style={{ color: "var(--muted-foreground)" }}>
                  {card.price.compareAtLabel}
                </span>
              ) : null}
              <span className="text-lg font-semibold" style={{ color: "var(--primary)" }}>
                {card.price.label}
              </span>
            </div>
          </div>
        </Link>
      ) : null}
    </div>
  )
}
