"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { VisualProductCardImage } from "@/components/products/visual-product-card-image"
import { useHydratedProductCard } from "@/lib/products/use-hydrated-product-card"

export const FEATURED_DEFAULTS = {
  title: "¡Por favor, no detengas la música!",
  subtitle: "La elección de los usuarios esta semana",
  productId: "",
  linkText: "Ver todos los productos",
  linkHref: "/shop",
  mainImage: "/woman-wearing-headphones-smiling.jpg",
  bgColor: "#b8fff5",
  textColor: "var(--secondary-foreground)",
  cardBgColor: "var(--card)",
  productBgColor: "var(--background)",
}

export function FeaturedProduct() {
  const { styles: styleData } = useComponentStyle("featured", FEATURED_DEFAULTS)
  const { componentEdits, isEditMode } = useAdmin()

  const edits = componentEdits.get("featured") || {}
  const featured = { ...FEATURED_DEFAULTS, ...styleData, ...edits }

  const { card } = useHydratedProductCard(featured.productId)
  const originalPrice =
    card && card.price.hasDiscount ? (card.price.compareAtLabel ?? null) : null

  return (
    // La imagen lifestyle es el fondo de la sección (anclada abajo-izquierda),
    // igual que en la referencia; el contenido vive en una columna a la derecha
    // que flota encima del fondo.
    <section
      data-component="featured"
      className="relative overflow-hidden rounded-2xl md:rounded-3xl mx-2 md:mx-4 my-4 md:my-8 flex items-center min-h-[480px] md:min-h-[560px] lg:min-h-[600px]"
      style={{
        backgroundColor: featured.bgColor,
        backgroundImage: `url(${featured.mainImage || "/placeholder.svg"})`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "15% bottom",
        backgroundSize: "contain",
        color: featured.textColor,
      }}
    >
      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="ml-auto flex w-full flex-col gap-8 text-center md:w-[56%] md:text-left lg:w-[50%]">
          <div>
            <h2 className="mb-3 font-heading text-4xl font-normal leading-tight md:text-5xl lg:text-[52px]">
              {featured.title}
            </h2>
            <p
              className="text-lg font-normal md:text-xl lg:text-[22px]"
              style={{ opacity: 0.9 }}
            >
              {featured.subtitle}
            </p>
          </div>

          {/* Card de producto compacta (texto arriba, imagen abajo); sale
              únicamente del producto elegido. Sin producto: en el editor se
              muestra un placeholder que guía al admin, y en vivo no se
              renderiza ninguna card (nunca datos falsos al cliente). */}
          {card ? (
            <Link href={card.href} className="mx-auto block w-full max-w-lg md:mx-0">
              <div
                className="cursor-pointer rounded-2xl p-6 text-left shadow-lg transition-shadow hover:shadow-xl md:p-8"
                style={{
                  backgroundColor: featured.cardBgColor,
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
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
                    <span
                      className="text-base line-through md:text-lg"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {originalPrice}
                    </span>
                  ) : null}
                  <span
                    className="text-lg font-normal md:text-xl"
                    style={{ color: "var(--card-foreground)" }}
                  >
                    {card.price.label}
                  </span>
                </div>
                <div
                  className="flex aspect-square items-center justify-center rounded-lg"
                  style={{ backgroundColor: featured.productBgColor }}
                >
                  <VisualProductCardImage
                    src={card.imageUrl}
                    alt={card.title}
                    title={card.title}
                    isOverlay={false}
                  />
                </div>
              </div>
            </Link>
          ) : isEditMode ? (
            <div className="mx-auto block w-full max-w-lg md:mx-0">
              <div
                className="rounded-2xl p-6 text-left shadow-lg md:p-8"
                style={{
                  backgroundColor: featured.cardBgColor,
                  color: "var(--card-foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                <p
                  className="text-sm md:text-base"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Elegí un producto del catálogo para mostrarlo acá
                </p>
                <div
                  className="mt-4 flex aspect-square items-center justify-center rounded-lg"
                  style={{ backgroundColor: featured.productBgColor }}
                >
                  <VisualProductCardImage
                    alt="Producto destacado sin elegir"
                    title="Producto destacado sin elegir"
                    isOverlay={false}
                  />
                </div>
              </div>
            </div>
          ) : null}

          <Button
            variant="link"
            className="mx-auto flex min-h-[44px] w-fit items-center gap-2 p-0 touch-manipulation md:mx-0"
            style={{ color: featured.textColor }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
            asChild
          >
            <Link href={featured.linkHref || "/shop"}>
              {featured.linkText} <span aria-hidden>→</span>
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
