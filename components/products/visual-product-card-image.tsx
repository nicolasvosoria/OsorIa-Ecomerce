"use client"

/* eslint-disable @next/next/no-img-element -- Storefront product media can be tenant-provided remote URLs; Next image migration is outside this UI-slice scope. */
import { useState } from "react"

interface VisualProductCardImageProps {
  src?: string
  alt: string
  title: string
  isOverlay: boolean
}

export function VisualProductCardImage({
  src,
  alt,
  title,
  isOverlay,
}: VisualProductCardImageProps) {
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)

  if (!src || failedImageUrl === src) {
    return (
      <div
        role="img"
        aria-label={`Sin imagen para ${title}`}
        className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-muted/40 px-4 text-center text-sm text-muted-foreground"
      >
        Sin imagen
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`h-full w-full ${isOverlay ? "object-cover transition-transform duration-300 group-hover:scale-105" : "object-contain"}`}
      onError={() => {
        setFailedImageUrl(src)
      }}
    />
  )
}
