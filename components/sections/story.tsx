"use client"

import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { isExternalLink } from "@/lib/sections/external-link"
import { resolveEmptySectionState, useIsPreviewOrAdminSection } from "@/lib/sections/section-empty-state"
import {
  STORY_CONTENT_ALIGN_CLASS,
  STORY_IMAGE_POSITION_IMAGE_ORDER_CLASS,
  STORY_IMAGE_POSITION_TEXT_ORDER_CLASS,
  resolveStoryContentAlign,
  resolveStoryImagePosition,
} from "@/lib/sections/story-variant"

export const STORY_DEFAULTS = {
  title: "Nuestra historia",
  description:
    "Todo empezó en una cocina pequeña, con una receta de familia y muchas ganas de compartirla. Hoy seguimos eligiendo los mismos ingredientes de calidad y el mismo cuidado artesanal en cada producto que sale de nuestras manos.",
  buttonText: "Conocé más",
  buttonLink: "",
  image: "",
  // Vacíos para usar los tokens globales del tema por defecto (ver mapeo en Story).
  sectionBgColor: "",
  titleColor: "",
  subtitleColor: "",
  buttonColor: "",
  buttonTextColor: "",
  imagePosition: "right",
  contentAlign: "left",
}

function StoryCta({
  buttonText,
  buttonLink,
  buttonColor,
  buttonTextColor,
}: {
  buttonText: string
  buttonLink: string
  buttonColor: string
  buttonTextColor: string
}) {
  if (!buttonText) return null

  const isExternal = isExternalLink(buttonLink)

  return (
    <Button
      className="w-fit rounded-[var(--button-radius)]"
      style={{ backgroundColor: buttonColor, color: buttonTextColor }}
      asChild
    >
      {isExternal ? (
        <a href={buttonLink} target="_blank" rel="noopener noreferrer">
          {buttonText}
        </a>
      ) : (
        <Link href={buttonLink || "#"}>{buttonText}</Link>
      )}
    </Button>
  )
}

export function Story() {
  const { styles: styleData } = useComponentStyle("story", STORY_DEFAULTS)
  const { componentEdits } = useAdmin()
  const isPreviewOrAdmin = useIsPreviewOrAdminSection()

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("story") || {}
  // title/description usan ?? porque un string vacío es un valor intencional; los colores usan || porque uno vacío
  // no es válido y cae al token global del tema activo (edit override > tema > default de fábrica).
  const title = edits.title ?? styleData.title ?? STORY_DEFAULTS.title
  const description = edits.description ?? styleData.description ?? STORY_DEFAULTS.description
  const buttonText = edits.buttonText ?? styleData.buttonText ?? STORY_DEFAULTS.buttonText
  const buttonLink = edits.buttonLink ?? styleData.buttonLink ?? STORY_DEFAULTS.buttonLink
  const image = edits.image ?? styleData.image ?? STORY_DEFAULTS.image
  const sectionBgColor =
    edits.sectionBgColor || styleData.sectionBgColor || "var(--sec-story-section-bg,var(--muted))"
  const titleColor =
    edits.titleColor || styleData.titleColor || "var(--sec-story-title,var(--foreground))"
  const subtitleColor =
    edits.subtitleColor ||
    styleData.subtitleColor ||
    "var(--sec-story-subtitle,var(--muted-foreground))"
  const buttonColor =
    edits.buttonColor || styleData.buttonColor || "var(--sec-story-button,var(--primary))"
  const buttonTextColor =
    edits.buttonTextColor ||
    styleData.buttonTextColor ||
    "var(--sec-story-button-text,var(--primary-foreground))"

  const imagePosition = resolveStoryImagePosition(
    edits.imagePosition ?? styleData.imagePosition ?? STORY_DEFAULTS.imagePosition,
  )
  const contentAlign = resolveStoryContentAlign(
    edits.contentAlign ?? styleData.contentAlign ?? STORY_DEFAULTS.contentAlign,
  )

  // No list to count here — the section's own content IS the title/description
  // pair, so "is there content" collapses to whether either one is filled in.
  const hasContent = title.trim().length > 0 || description.trim().length > 0
  const emptyState = resolveEmptySectionState(hasContent ? 1 : 0, isPreviewOrAdmin)
  if (emptyState === "hidden") return null

  const showImage = imagePosition !== "none" && Boolean(image)
  const contentAlignClass = STORY_CONTENT_ALIGN_CLASS[contentAlign]
  const textOrderClass = STORY_IMAGE_POSITION_TEXT_ORDER_CLASS[imagePosition]
  const imageOrderClass = STORY_IMAGE_POSITION_IMAGE_ORDER_CLASS[imagePosition]

  return (
    <section
      data-component="story"
      className="py-8 md:py-16 px-4"
      style={{ backgroundColor: sectionBgColor }}
    >
      <div
        className={`container mx-auto grid gap-8 ${showImage ? "md:grid-cols-2 md:items-center" : ""}`}
      >
        <div className={`flex flex-col gap-4 ${contentAlignClass} ${textOrderClass}`}>
          {emptyState === "placeholder" ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Completá el título o la descripción desde el editor para mostrar la historia de marca.
            </p>
          ) : (
            <>
              <h2
                className="text-2xl md:text-4xl lg:text-[47px] font-heading font-normal"
                style={{ color: titleColor }}
              >
                {title}
              </h2>
              <p className="max-w-2xl text-sm md:text-base" style={{ color: subtitleColor }}>
                {description}
              </p>
              <StoryCta
                buttonText={buttonText}
                buttonLink={buttonLink}
                buttonColor={buttonColor}
                buttonTextColor={buttonTextColor}
              />
            </>
          )}
        </div>

        {showImage ? (
          <div className={`relative aspect-[4/3] w-full overflow-hidden rounded-card ${imageOrderClass}`}>
            <Image src={image} alt={title} fill className="object-cover" />
          </div>
        ) : null}
      </div>
    </section>
  )
}
