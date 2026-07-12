"use client"

import Image from "next/image"
import { Instagram as InstagramIcon } from "lucide-react"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { SectionShell } from "@/components/sections/section-shell"
import { resolveEmptySectionState, useIsPreviewOrAdminSection } from "@/lib/sections/section-empty-state"
import {
  INSTAGRAM_COLUMNS_CLASS,
  INSTAGRAM_GAP_CLASS,
  resolveInstagramColumns,
  resolveInstagramGap,
} from "@/lib/sections/instagram-variant"

type InstagramPost = {
  image: string
  link: string
}

export const INSTAGRAM_DEFAULTS = {
  title: "Seguinos en Instagram",
  description: "",
  handle: "osoria.tienda",
  // Vacíos para usar los tokens globales del tema por defecto (ver mapeo en Instagram).
  sectionBgColor: "",
  titleColor: "",
  subtitleColor: "",
  columns: "4",
  gap: "sm",
  posts: [
    { image: "/placeholder.svg", link: "" },
    { image: "/placeholder.svg", link: "" },
    { image: "/placeholder.svg", link: "" },
    { image: "/placeholder.svg", link: "" },
  ] satisfies InstagramPost[],
}

export function Instagram() {
  const { styles: styleData } = useComponentStyle("instagram", INSTAGRAM_DEFAULTS)
  const { componentEdits } = useAdmin()
  const isPreviewOrAdmin = useIsPreviewOrAdminSection()

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("instagram") || {}
  // title/description/handle usan ?? porque un string vacío es un valor intencional; los colores usan || porque uno
  // vacío no es válido y cae al token global del tema activo (edit override > tema > default de fábrica).
  const title = edits.title ?? styleData.title ?? INSTAGRAM_DEFAULTS.title
  const description = edits.description ?? styleData.description ?? INSTAGRAM_DEFAULTS.description
  const handle = edits.handle ?? styleData.handle ?? INSTAGRAM_DEFAULTS.handle
  const sectionBgColor =
    edits.sectionBgColor ||
    styleData.sectionBgColor ||
    "var(--sec-instagram-section-bg,var(--muted))"
  const titleColor =
    edits.titleColor || styleData.titleColor || "var(--sec-instagram-title,var(--foreground))"
  const subtitleColor =
    edits.subtitleColor ||
    styleData.subtitleColor ||
    "var(--sec-instagram-subtitle,var(--muted-foreground))"

  // Unlike `whyus`, an explicitly emptied list is NOT refilled with
  // `INSTAGRAM_DEFAULTS.posts` — a real empty array must survive so
  // `resolveEmptySectionState` below can hide the section on the published site.
  const items: InstagramPost[] = edits.posts ?? styleData.posts ?? INSTAGRAM_DEFAULTS.posts

  const columns = resolveInstagramColumns(
    edits.columns ?? styleData.columns ?? INSTAGRAM_DEFAULTS.columns,
  )
  const gap = resolveInstagramGap(edits.gap ?? styleData.gap ?? INSTAGRAM_DEFAULTS.gap)

  const emptyState = resolveEmptySectionState(items.length, isPreviewOrAdmin)
  if (emptyState === "hidden") return null

  const columnsClass = INSTAGRAM_COLUMNS_CLASS[columns]
  const gapClass = INSTAGRAM_GAP_CLASS[gap]
  const handleName = handle.replace(/^@/, "")

  const handleLink = handle ? (
    <a
      href={`https://instagram.com/${handleName}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm md:text-base"
      style={{ color: subtitleColor }}
    >
      <InstagramIcon className="h-4 w-4 shrink-0" aria-hidden="true" />@{handleName}
    </a>
  ) : undefined

  return (
    <SectionShell
      componentName="instagram"
      sectionBgColor={sectionBgColor}
      title={title}
      titleColor={titleColor}
      titleAdornment={handleLink}
      hasTitleAdornment
      description={description}
      subtitleColor={subtitleColor}
      emptyState={emptyState}
      placeholder="Agregá publicaciones desde el editor para mostrarlas aquí."
    >
      <div className={`grid ${columnsClass} ${gapClass}`}>
        {items.map((item, index) => {
          const postImage = (
            <Image
              src={item.image}
              alt="Publicación de Instagram"
              width={320}
              height={320}
              className="aspect-square h-full w-full object-cover"
            />
          )
          return (
            <div key={`${item.image}-${index}`} className="aspect-square overflow-hidden">
              {item.link ? (
                <a href={item.link} target="_blank" rel="noopener noreferrer">
                  {postImage}
                </a>
              ) : (
                postImage
              )}
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}
