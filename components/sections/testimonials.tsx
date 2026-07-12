"use client"

import Image from "next/image"
import { Quote } from "lucide-react"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { SectionShell } from "@/components/sections/section-shell"
import { resolveEmptySectionState, useIsPreviewOrAdminSection } from "@/lib/sections/section-empty-state"
import {
  TESTIMONIALS_CARD_STYLE_CLASS,
  TESTIMONIALS_COLUMNS_CLASS,
  TESTIMONIALS_CONTENT_ALIGN_CLASS,
  resolveTestimonialsCardStyle,
  resolveTestimonialsColumns,
  resolveTestimonialsContentAlign,
} from "@/lib/sections/testimonials-variant"

type TestimonialItem = {
  quote: string
  author: string
  role: string
  image: string
}

export const TESTIMONIALS_DEFAULTS = {
  title: "Lo que dicen nuestros clientes",
  description: "",
  // Vacíos para usar los tokens globales del tema por defecto (ver mapeo en Testimonials).
  sectionBgColor: "",
  cardBgColor: "",
  titleColor: "",
  subtitleColor: "",
  quoteColor: "",
  authorColor: "",
  roleColor: "",
  columns: "3",
  cardStyle: "card",
  contentAlign: "left",
  testimonials: [
    {
      quote: "El mejor servicio que probé, la entrega fue rapidísima.",
      author: "Lucía Fernández",
      role: "Clienta frecuente",
      image: "",
    },
    {
      quote: "Calidad excelente y atención impecable de principio a fin.",
      author: "Martín Gómez",
      role: "Cliente verificado",
      image: "",
    },
    {
      quote: "Volvería a comprar sin dudarlo, superó mis expectativas.",
      author: "Sofía Ramírez",
      role: "Clienta nueva",
      image: "",
    },
  ] satisfies TestimonialItem[],
}

export function Testimonials() {
  const { styles: styleData } = useComponentStyle("testimonials", TESTIMONIALS_DEFAULTS)
  const { componentEdits } = useAdmin()
  const isPreviewOrAdmin = useIsPreviewOrAdminSection()

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("testimonials") || {}
  // title/description usan ?? porque un string vacío es un valor intencional; los colores usan || porque uno vacío
  // no es válido y cae al token global del tema activo (edit override > tema > default de fábrica).
  const title = edits.title ?? styleData.title ?? TESTIMONIALS_DEFAULTS.title
  const description = edits.description ?? styleData.description ?? TESTIMONIALS_DEFAULTS.description
  const sectionBgColor =
    edits.sectionBgColor ||
    styleData.sectionBgColor ||
    "var(--sec-testimonials-section-bg,var(--muted))"
  const cardBgColor =
    edits.cardBgColor || styleData.cardBgColor || "var(--sec-testimonials-card-bg,var(--card))"
  const titleColor =
    edits.titleColor || styleData.titleColor || "var(--sec-testimonials-title,var(--foreground))"
  const subtitleColor =
    edits.subtitleColor ||
    styleData.subtitleColor ||
    "var(--sec-testimonials-subtitle,var(--muted-foreground))"
  const quoteColor =
    edits.quoteColor || styleData.quoteColor || "var(--sec-testimonials-quote,var(--foreground))"
  const authorColor =
    edits.authorColor || styleData.authorColor || "var(--sec-testimonials-author,var(--foreground))"
  const roleColor =
    edits.roleColor ||
    styleData.roleColor ||
    "var(--sec-testimonials-role,var(--muted-foreground))"

  // Unlike `whyus`, an explicitly emptied list is NOT refilled with
  // `TESTIMONIALS_DEFAULTS.testimonials` — a real empty array must survive so
  // `resolveEmptySectionState` below can hide the section on the published site.
  const items: TestimonialItem[] =
    edits.testimonials ?? styleData.testimonials ?? TESTIMONIALS_DEFAULTS.testimonials

  const columns = resolveTestimonialsColumns(
    edits.columns ?? styleData.columns ?? TESTIMONIALS_DEFAULTS.columns,
  )
  const cardStyle = resolveTestimonialsCardStyle(
    edits.cardStyle ?? styleData.cardStyle ?? TESTIMONIALS_DEFAULTS.cardStyle,
  )
  const contentAlign = resolveTestimonialsContentAlign(
    edits.contentAlign ?? styleData.contentAlign ?? TESTIMONIALS_DEFAULTS.contentAlign,
  )

  const emptyState = resolveEmptySectionState(items.length, isPreviewOrAdmin)
  if (emptyState === "hidden") return null

  const columnsClass = TESTIMONIALS_COLUMNS_CLASS[columns]
  const cardStyleClass = TESTIMONIALS_CARD_STYLE_CLASS[cardStyle]
  const contentAlignClass = TESTIMONIALS_CONTENT_ALIGN_CLASS[contentAlign]

  return (
    <SectionShell
      componentName="testimonials"
      sectionBgColor={sectionBgColor}
      title={title}
      titleColor={titleColor}
      description={description}
      subtitleColor={subtitleColor}
      emptyState={emptyState}
      placeholder="Agregá testimonios desde el editor para mostrarlos aquí."
    >
      <div className={`grid ${columnsClass} gap-4 md:gap-8`}>
        {items.map((item, index) => (
          <div
            key={`${item.author}-${index}`}
            className={`flex flex-col ${contentAlignClass} ${cardStyleClass}`}
            style={cardStyle === "card" ? { backgroundColor: cardBgColor } : undefined}
          >
            <Quote className="mb-4 h-6 w-6 shrink-0" style={{ color: quoteColor }} aria-hidden="true" />
            <p className="mb-4 text-sm md:text-base" style={{ color: quoteColor }}>
              {item.quote}
            </p>
            <div className="mt-auto flex items-center gap-3">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.author}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : null}
              <div>
                <p className="text-sm font-medium" style={{ color: authorColor }}>
                  {item.author}
                </p>
                <p className="text-xs" style={{ color: roleColor }}>
                  {item.role}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  )
}
