"use client"

import { useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import { Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { deleteImage, uploadImage } from "@/lib/supabase/storage-api"

const DEFAULT_MAX_PRODUCT_IMAGES = 5
const DEFAULT_UPLOAD_CONTEXT = "product-images"

interface MultiImageUploadProps {
  images: string[]
  onChange: (images: string[]) => void
  label?: string
  maxImages?: number
  context?: string
  maxSizeMB?: number
  accept?: string
  resetToken?: number
}

type FileValidation = {
  file: File
  nextImages: string[]
  maxImages: number
  maxSizeMB: number
  enforceLimit: boolean
}

function formatFileSizeMB(file: File) {
  return (file.size / 1024 / 1024).toFixed(2)
}

function isValidUploadFile({
  file,
  nextImages,
  maxImages,
  maxSizeMB,
  enforceLimit,
}: FileValidation) {
  if (!file.type.startsWith("image/")) {
    toast.error(`${file.name}: selecciona un archivo de imagen válido`)
    return false
  }

  const maxSize = maxSizeMB * 1024 * 1024
  if (file.size > maxSize) {
    toast.error(
      `${file.name}: archivo demasiado grande. Tamaño máximo permitido: ${maxSizeMB}MB. Tu archivo: ${formatFileSizeMB(file)}MB`,
      { duration: 5000 },
    )
    return false
  }

  if (enforceLimit && nextImages.length >= maxImages) {
    toast.error(`${file.name}: solo se permiten máximo ${maxImages} imágenes`)
    return false
  }

  return true
}

export function MultiImageUpload({
  images = [],
  onChange,
  label = "Imágenes",
  maxImages = DEFAULT_MAX_PRODUCT_IMAGES,
  context,
  maxSizeMB = 1,
  accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  resetToken = 0,
}: MultiImageUploadProps) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resetTokenRef = useRef(resetToken)
  const [uploading, setUploading] = useState<number | null>(null)

  useEffect(() => {
    resetTokenRef.current = resetToken
  }, [resetToken])

  const uploadFiles = async (files: File[], replaceIndex?: number) => {
    if (files.length === 0) return

    const uploadResetToken = resetTokenRef.current
    const replacementIndex = replaceIndex
    const isReplacement = replacementIndex !== undefined
    const selectedFiles = isReplacement ? files.slice(0, 1) : files
    let nextImages = [...images]
    let uploadedCount = 0

    for (const file of selectedFiles) {
      if (
        !isValidUploadFile({
          file,
          nextImages,
          maxImages,
          maxSizeMB,
          enforceLimit: !isReplacement,
        })
      ) {
        continue
      }

      const uploadIndex = replacementIndex ?? nextImages.length
      setUploading(uploadIndex)

      try {
        const result = await uploadImage(file, context || DEFAULT_UPLOAD_CONTEXT)

        if (uploadResetToken !== resetTokenRef.current) {
          return
        }

        if (result.success && result.url) {
          if (replacementIndex !== undefined) {
            nextImages[replacementIndex] = result.url
          } else {
            nextImages = [...nextImages, result.url].slice(0, maxImages)
          }

          onChange(nextImages)
          uploadedCount++
        } else {
          toast.error(`${file.name}: ${result.error || "Error al subir la imagen"}`)
        }
      } catch (error) {
        console.error("[MultiImageUpload] Error:", error)
        toast.error(`${file.name}: error al subir la imagen`)
      } finally {
        setUploading(null)
      }
    }

    if (uploadedCount === 1) {
      toast.success("Imagen subida correctamente")
      return
    }

    if (uploadedCount > 1) {
      toast.success(`${uploadedCount} imágenes subidas correctamente`)
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const files = Array.from(event.target.files || [])
    await uploadFiles(files, index)
    event.target.value = ""
  }

  const handleRemove = async (index: number) => {
    const imageToRemove = images[index]

    if (imageToRemove && imageToRemove.includes("supabase.co/storage")) {
      try {
        await deleteImage(imageToRemove)
        toast.success("Imagen eliminada")
      } catch (error) {
        console.error("[MultiImageUpload] Error al eliminar:", error)
      }
    }

    onChange(images.filter((_, imageIndex) => imageIndex !== index))
  }

  const canAddMore = images.length < maxImages
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label>
          {label} ({images.length}/{maxImages})
        </Label>
        <div>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={accept}
            multiple
            className="sr-only"
            aria-label="Seleccionar imágenes"
            onChange={(event) => handleFileSelect(event)}
            disabled={!canAddMore}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFilePicker}
            disabled={!canAddMore}
          >
            <Upload className="h-4 w-4 mr-2" />
            Seleccionar imágenes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {Array.from({ length: maxImages }).map((_, index) => {
          const imageUrl = images[index]
          const isUploading = uploading === index

          return (
            <div
              key={index}
              className="relative aspect-square border-2 border-dashed rounded-lg overflow-hidden bg-muted"
            >
              {imageUrl ? (
                <>
                  <Image
                    src={imageUrl}
                    alt={`Imagen ${index + 1}`}
                    fill
                    className="object-cover"
                    onError={() => {
                      handleRemove(index)
                    }}
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-8 w-8"
                    onClick={() => handleRemove(index)}
                    disabled={isUploading}
                    aria-label={`Eliminar imagen ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 left-2 right-2"
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = accept
                      input.onchange = (event) => {
                        void handleFileSelect(event as unknown as React.ChangeEvent<HTMLInputElement>, index)
                      }
                      input.click()
                    }}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      "Reemplazar"
                    )}
                  </Button>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-2">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground">Subiendo...</span>
                    </>
                  ) : canAddMore ? (
                    <>
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-xs text-muted-foreground text-center">
                        Imagen {index + 1}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground text-center">
                      Límite alcanzado
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">Límite:</span> Máximo {maxImages} imágenes por producto
        </p>
        <p className="text-xs text-muted-foreground">
          Tamaño máximo por imagen: {maxSizeMB}MB
        </p>
      </div>
    </div>
  )
}
