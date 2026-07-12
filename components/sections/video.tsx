"use client"

import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { SectionShell } from "@/components/sections/section-shell"
import { isToggleOn } from "@/lib/section-editor/toggle-value"
import { resolveEmptySectionState, useIsPreviewOrAdminSection } from "@/lib/sections/section-empty-state"
import { parseVideoEmbed } from "@/lib/sections/video-embed"
import { VIDEO_ASPECT_RATIO_CLASS, resolveVideoAspectRatio } from "@/lib/sections/video-variant"

export const VIDEO_DEFAULTS = {
  title: "Mirá nuestro video",
  description: "",
  // Vacíos para usar los tokens globales del tema por defecto (ver mapeo en Video).
  sectionBgColor: "",
  titleColor: "",
  subtitleColor: "",
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  poster: "",
  aspectRatio: "16:9",
  autoplay: false,
}

// YouTube/Vimeo require `mute`/`muted` alongside `autoplay` — browsers block
// autoplaying media with sound. Query strings differ per host, so this stays
// keyed by the embed `kind` `parseVideoEmbed` already resolved.
const YOUTUBE_AUTOPLAY_QUERY = "autoplay=1&mute=1"
const VIMEO_AUTOPLAY_QUERY = "autoplay=1&muted=1"

function withAutoplayQuery(embedSrc: string, kind: "youtube" | "vimeo"): string {
  const query = kind === "youtube" ? YOUTUBE_AUTOPLAY_QUERY : VIMEO_AUTOPLAY_QUERY
  return `${embedSrc}?${query}`
}

export function Video() {
  const { styles: styleData } = useComponentStyle("video", VIDEO_DEFAULTS)
  const { componentEdits } = useAdmin()
  const isPreviewOrAdmin = useIsPreviewOrAdminSection()

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("video") || {}
  // title/description usan ?? porque un string vacío es un valor intencional; los colores usan || porque uno vacío
  // no es válido y cae al token global del tema activo (edit override > tema > default de fábrica).
  const title = edits.title ?? styleData.title ?? VIDEO_DEFAULTS.title
  const description = edits.description ?? styleData.description ?? VIDEO_DEFAULTS.description
  const sectionBgColor =
    edits.sectionBgColor || styleData.sectionBgColor || "var(--sec-video-section-bg,var(--muted))"
  const titleColor =
    edits.titleColor || styleData.titleColor || "var(--sec-video-title,var(--foreground))"
  const subtitleColor =
    edits.subtitleColor ||
    styleData.subtitleColor ||
    "var(--sec-video-subtitle,var(--muted-foreground))"

  const url = edits.url ?? styleData.url ?? VIDEO_DEFAULTS.url
  const poster = edits.poster ?? styleData.poster ?? VIDEO_DEFAULTS.poster
  const aspectRatio = resolveVideoAspectRatio(
    edits.aspectRatio ?? styleData.aspectRatio ?? VIDEO_DEFAULTS.aspectRatio,
  )
  const autoplay = isToggleOn(edits.autoplay ?? styleData.autoplay ?? VIDEO_DEFAULTS.autoplay)

  const embed = parseVideoEmbed(url)

  // No list to count here — the "is there content" signal is whether the
  // configured URL resolves to a playable embed at all.
  const emptyState = resolveEmptySectionState(embed.kind === "invalid" ? 0 : 1, isPreviewOrAdmin)
  if (emptyState === "hidden") return null

  const aspectClass = VIDEO_ASPECT_RATIO_CLASS[aspectRatio]

  return (
    <SectionShell
      componentName="video"
      sectionBgColor={sectionBgColor}
      title={title}
      titleColor={titleColor}
      description={description}
      subtitleColor={subtitleColor}
      emptyState={emptyState}
      placeholder="Agregá una URL de video (YouTube, Vimeo o MP4) desde el editor para mostrarlo aquí."
    >
      <div className={`relative w-full overflow-hidden rounded-card ${aspectClass}`}>
        {embed.kind === "invalid" ? null : embed.kind === "file" ? (
          <video
            src={embed.src}
            poster={poster || undefined}
            controls
            autoPlay={autoplay}
            muted={autoplay}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <iframe
            src={autoplay ? withAutoplayQuery(embed.embedSrc, embed.kind) : embed.embedSrc}
            title={title}
            className="absolute inset-0 h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            // `allow-same-origin` is required for the YouTube/Vimeo player to
            // initialize (without it the embed loads blank/black). This is safe
            // here because `embedSrc` only ever points to the fixed, whitelisted
            // youtube.com/embed or player.vimeo.com hosts built by
            // `parseVideoEmbed` — never our own origin — so the sandboxed frame
            // can't use `allow-same-origin` to reach back into this app.
            sandbox="allow-same-origin allow-scripts allow-popups allow-presentation"
            allow={
              autoplay
                ? "autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
                : "accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
            }
            allowFullScreen
          />
        )}
      </div>
    </SectionShell>
  )
}
