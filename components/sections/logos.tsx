"use client"

import Image from "next/image"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { SectionShell } from "@/components/sections/section-shell"
import { resolveEmptySectionState, useIsPreviewOrAdminSection } from "@/lib/sections/section-empty-state"
import { isToggleOn } from "@/lib/section-editor/toggle-value"
import {
  LOGOS_ALIGN_CLASS,
  LOGOS_COLUMNS_CLASS,
  LOGOS_GRAYSCALE_CLASS,
  LOGOS_SIZE_CLASS,
  resolveLogosAlign,
  resolveLogosColumns,
  resolveLogosSize,
} from "@/lib/sections/logos-variant"

type LogoItem = {
  image: string
  link: string
}

export const LOGOS_DEFAULTS = {
  title: "Marcas que confían en nosotros",
  description: "",
  // Vacíos para usar los tokens globales del tema por defecto (ver mapeo en Logos).
  sectionBgColor: "",
  titleColor: "",
  subtitleColor: "",
  columns: "5",
  grayscale: true,
  size: "md",
  align: "center",
  logos: [
    { image: "/placeholder.svg", link: "" },
    { image: "/placeholder.svg", link: "" },
    { image: "/placeholder.svg", link: "" },
  ] satisfies LogoItem[],
}

export function Logos() {
  const { styles: styleData } = useComponentStyle("logos", LOGOS_DEFAULTS)
  const { componentEdits } = useAdmin()
  const isPreviewOrAdmin = useIsPreviewOrAdminSection()

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("logos") || {}
  // title/description usan ?? porque un string vacío es un valor intencional; los colores usan || porque uno vacío
  // no es válido y cae al token global del tema activo (edit override > tema > default de fábrica).
  const title = edits.title ?? styleData.title ?? LOGOS_DEFAULTS.title
  const description = edits.description ?? styleData.description ?? LOGOS_DEFAULTS.description
  const sectionBgColor =
    edits.sectionBgColor || styleData.sectionBgColor || "var(--sec-logos-section-bg,var(--muted))"
  const titleColor =
    edits.titleColor || styleData.titleColor || "var(--sec-logos-title,var(--foreground))"
  const subtitleColor =
    edits.subtitleColor ||
    styleData.subtitleColor ||
    "var(--sec-logos-subtitle,var(--muted-foreground))"

  // Unlike `whyus`, an explicitly emptied list is NOT refilled with
  // `LOGOS_DEFAULTS.logos` — a real empty array must survive so
  // `resolveEmptySectionState` below can hide the section on the published site.
  const items: LogoItem[] = edits.logos ?? styleData.logos ?? LOGOS_DEFAULTS.logos

  const columns = resolveLogosColumns(edits.columns ?? styleData.columns ?? LOGOS_DEFAULTS.columns)
  const size = resolveLogosSize(edits.size ?? styleData.size ?? LOGOS_DEFAULTS.size)
  const align = resolveLogosAlign(edits.align ?? styleData.align ?? LOGOS_DEFAULTS.align)
  const grayscale = isToggleOn(edits.grayscale ?? styleData.grayscale ?? LOGOS_DEFAULTS.grayscale)

  const emptyState = resolveEmptySectionState(items.length, isPreviewOrAdmin)
  if (emptyState === "hidden") return null

  const columnsClass = LOGOS_COLUMNS_CLASS[columns]
  const sizeClass = LOGOS_SIZE_CLASS[size]
  const alignClass = LOGOS_ALIGN_CLASS[align]
  const grayscaleClass = grayscale ? LOGOS_GRAYSCALE_CLASS : ""

  return (
    <SectionShell
      componentName="logos"
      sectionBgColor={sectionBgColor}
      title={title}
      titleColor={titleColor}
      description={description}
      subtitleColor={subtitleColor}
      emptyState={emptyState}
      placeholder="Agregá logos desde el editor para mostrarlos aquí."
    >
      <div className={`grid ${columnsClass} ${alignClass} gap-6 md:gap-10`}>
        {items.map((item, index) => {
          const logoImage = (
            <Image
              src={item.image}
              alt="Logo"
              width={160}
              height={64}
              className={`object-contain ${sizeClass} ${grayscaleClass}`}
            />
          )
          return (
            <div key={`${item.image}-${index}`} className="flex items-center">
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {logoImage}
                </a>
              ) : (
                logoImage
              )}
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}
