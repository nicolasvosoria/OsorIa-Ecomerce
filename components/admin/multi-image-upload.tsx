"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X, Loader2 } from "lucide-react"
import { uploadImage, deleteImage } from "@/lib/supabase/storage-api"
import { toast } from "sonner"
import Image from "next/image"

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

export function MultiImageUpload({
  images = [],
  onChange,
  label = "Imágenes",
  maxImages = 3,
  context,
  maxSizeMB = 1, // Por defecto 1 MB para imágenes de productos
  accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif",
  resetToken = 0,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState<number | null>(null)
  const resetTokenRef = useRef(resetToken)

  useEffect(() => {
    resetTokenRef.current = resetToken
  }, [resetToken])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, index?: number) => {
    const file = event.target.files?.[0]
    const uploadResetToken = resetTokenRef.current
    if (!file) return

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona un archivo de imagen válido")
      return
    }

    // Validar tamaño - Para productos, máximo 1 MB
    const maxSize = maxSizeMB * 1024 * 1024
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
    
    if (file.size > maxSize) {
      toast.error(
        `El archivo es demasiado grande. Tamaño máximo permitido: ${maxSizeMB}MB. Tu archivo: ${fileSizeMB}MB`,
        { duration: 5000 }
      )
      return
    }

    // Validar límite de imágenes
    if (images.length >= maxImages && index === undefined) {
      toast.error(`Solo se permiten máximo ${maxImages} imágenes`)
      return
    }

    // Subir archivo
    const uploadIndex = index !== undefined ? index : images.length
    setUploading(uploadIndex)
    try {
      const result = await uploadImage(file, context || "product-images")

      if (uploadResetToken !== resetTokenRef.current) {
        return
      }

      if (result.success && result.url) {
        const newImages = [...images]
        if (index !== undefined) {
          // Reemplazar imagen existente
          newImages[index] = result.url
        } else {
          // Agregar nueva imagen
          newImages.push(result.url)
        }
        onChange(newImages.slice(0, maxImages)) // Asegurar que no exceda el límite
        toast.success("Imagen subida correctamente")
      } else {
        toast.error(result.error || "Error al subir la imagen")
      }
    } catch (error) {
      console.error("[MultiImageUpload] Error:", error)
      toast.error("Error al subir la imagen")
    } finally {
      setUploading(null)
      // Limpiar input
      if (event.target) {
        event.target.value = ""
      }
    }
  }

  const handleRemove = async (index: number) => {
    const imageToRemove = images[index]
    
    // Si es una imagen de Supabase Storage, intentar eliminarla
    if (imageToRemove && imageToRemove.includes("supabase.co/storage")) {
      try {
        await deleteImage(imageToRemove)
        toast.success("Imagen eliminada")
      } catch (error) {
        console.error("[MultiImageUpload] Error al eliminar:", error)
        // Continuar aunque falle la eliminación
      }
    }

    const newImages = images.filter((_, i) => i !== index)
    onChange(newImages)
  }

  const canAddMore = images.length < maxImages

  return (
    <div className="space-y-4">
      <Label>
        {label} ({images.length}/{maxImages})
      </Label>

      {/* Grid de imágenes */}
      <div className="grid grid-cols-3 gap-4">
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
                      // Si la imagen falla al cargar, eliminarla
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
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {/* Botón para reemplazar */}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-2 left-2 right-2"
                    onClick={() => {
                      const input = document.createElement("input")
                      input.type = "file"
                      input.accept = accept
                      input.onchange = (e) => handleFileSelect(e as any, index)
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          const input = document.createElement("input")
                          input.type = "file"
                          input.accept = accept
                          input.onchange = (e) => handleFileSelect(e as any, index)
                          input.click()
                        }}
                      >
                        Subir
                      </Button>
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

      {/* Información */}
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
