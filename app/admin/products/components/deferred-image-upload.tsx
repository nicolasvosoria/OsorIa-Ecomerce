"use client"

import Image from "next/image"
import { useEffect, useMemo } from "react"
import { ImageIcon, Upload, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeferredImageUploadProps {
  imageUrl: string
  selectedFile: File | null
  onImageUrlChange: (url: string) => void
  onFileChange: (file: File | null) => void
  onValidationError?: (message: string) => void
  label?: string
  maxSizeMB?: number
  accept?: string
}

export function DeferredImageUpload({
  imageUrl,
  selectedFile,
  onImageUrlChange,
  onFileChange,
  onValidationError,
  label = "Imagen",
  maxSizeMB = 1,
  accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif",
}: DeferredImageUploadProps) {
  const previewUrl = useMemo(() => {
    if (!selectedFile) return imageUrl.trim()
    return URL.createObjectURL(selectedFile)
  }, [imageUrl, selectedFile])

  useEffect(() => {
    if (!selectedFile || !previewUrl.startsWith("blob:")) return undefined
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl, selectedFile])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      onFileChange(null)
      event.target.value = ""
      onValidationError?.("Por favor selecciona un archivo de imagen válido")
      return
    }

    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      onFileChange(null)
      event.target.value = ""
      onValidationError?.(`El archivo supera el máximo de ${maxSizeMB}MB`)
      return
    }

    onFileChange(file)
  }

  const clearImage = () => {
    onFileChange(null)
    onImageUrlChange("")
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="relative aspect-square overflow-hidden rounded-lg border border-dashed bg-muted">
        {previewUrl ? (
          <Image src={previewUrl} alt="Vista previa de imagen del combo" fill className="object-cover" unoptimized />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-8 w-8" />
            <span className="text-xs">Sin imagen seleccionada</span>
          </div>
        )}
        {(previewUrl || selectedFile) && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={clearImage}
            aria-label="Quitar imagen del combo"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="combo-image-file" className="text-sm font-medium">Seleccionar archivo</Label>
        <div className="flex items-center gap-2">
          <Input
            id="combo-image-file"
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="cursor-pointer"
          />
          <Upload className="h-4 w-4 text-muted-foreground" />
        </div>
        {selectedFile && (
          <p className="text-xs text-muted-foreground">
            Se subirá al guardar: {selectedFile.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="combo-image-url" className="text-sm font-medium">O pegar URL existente</Label>
        <Input
          id="combo-image-url"
          value={imageUrl}
          onChange={(event) => {
            onFileChange(null)
            onImageUrlChange(event.target.value)
          }}
          placeholder="https://..."
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Vista previa inmediata. El archivo se sube recién al guardar el combo; máximo {maxSizeMB}MB.
      </p>
    </div>
  )
}
