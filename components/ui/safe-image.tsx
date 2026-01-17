"use client"

import { useState } from "react"
import Image from "next/image"

interface SafeImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  fill?: boolean
  sizes?: string
  priority?: boolean
  quality?: number
  fallback?: string
}

/**
 * Componente Image seguro que maneja errores de carga
 * y muestra un placeholder cuando la imagen no existe
 */
export function SafeImage({
  src,
  alt,
  width,
  height,
  className,
  fill,
  sizes,
  priority,
  quality,
  fallback = "/placeholder.svg",
}: SafeImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  const handleError = () => {
    if (!hasError && imgSrc !== fallback) {
      setHasError(true)
      setImgSrc(fallback)
    }
  }

  const imageProps = {
    src: imgSrc,
    alt,
    className,
    onError: handleError,
    sizes,
    priority,
    quality,
  }

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
      />
    )
  }

  return (
    <Image
      {...imageProps}
      width={width || 400}
      height={height || 400}
    />
  )
}








