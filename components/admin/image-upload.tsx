"use client"

import { useEffect, useId, useRef, useState } from "react"
import Image from "next/image"
import { ImageIcon, ImageOff, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  ALLOWED_IMAGE_TYPE_LABELS,
  DEFAULT_MAX_IMAGE_SIZE_MB,
  IMAGE_UPLOAD_ACCEPT,
  validateImageFile,
} from "@/lib/images/image-file"
import { deferStateUpdate } from "@/lib/react/defer-state-update"
import { deleteImage, isStoredImageUrl, uploadImage } from "@/lib/supabase/storage-api"

const UPLOAD_ERROR_MESSAGE = "Error al subir la imagen"
const DELETE_ERROR_MESSAGE = "No se pudo eliminar la imagen"

type RecommendedSize = {
  width: number
  height: number
}

type ImageFieldProps = {
  label?: string
  context?: string
  maxSizeMB?: number
  recommendedSize?: RecommendedSize
}

type SingleImageUploadProps = ImageFieldProps & {
  multiple?: false
  value: string
  onChange: (url: string) => void
  // Con deferUpload la subida la ejecuta quien llama al guardar su formulario:
  // ni subir ni borrar en storage puede ocurrir desde aquí, porque el registro
  // que apunta a la imagen todavía no se ha escrito.
  deferUpload?: boolean
  onFileSelect?: (file: File | null) => void
  allowUrlInput?: boolean
}

type MultiImageUploadProps = ImageFieldProps & {
  multiple: true
  values: string[]
  onChange: (urls: string[]) => void
  maxImages: number
  resetToken?: number
}

type ImageUploadProps = SingleImageUploadProps | MultiImageUploadProps

export function ImageUpload(props: ImageUploadProps) {
  if (props.multiple) {
    return <MultiImageField {...props} />
  }

  return <SingleImageField {...props} />
}

function SingleImageField({
  value,
  onChange,
  onFileSelect,
  label = "Imagen",
  context,
  maxSizeMB = DEFAULT_MAX_IMAGE_SIZE_MB,
  recommendedSize,
  deferUpload = false,
  allowUrlInput = false,
}: SingleImageUploadProps) {
  const fileInputId = useId()
  const urlInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)

  useEffect(() => {
    deferStateUpdate(() => setPreview(value || null))
  }, [value])

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file, maxSizeMB)
    if (validationError) {
      toast.error(validationError)
      clearFileInput()
      return
    }

    showLocalPreview(file, setPreview)

    if (deferUpload) {
      onFileSelect?.(file)
      clearFileInput()
      return
    }

    setUploading(true)
    try {
      const result = await uploadImage(file, context, maxSizeMB)

      if (!result.success || !result.url) {
        toast.error(result.error || UPLOAD_ERROR_MESSAGE)
        setPreview(value || null)
        return
      }

      onChange(result.url)
      toast.success("Imagen subida correctamente")
    } catch (error) {
      console.error("[ImageUpload] Error al subir:", error)
      toast.error(UPLOAD_ERROR_MESSAGE)
      setPreview(value || null)
    } finally {
      setUploading(false)
      clearFileInput()
    }
  }

  const handleRemove = async () => {
    if (!value && !preview) return

    if (!deferUpload && isStoredImageUrl(value)) {
      await removeStoredImage(value)
    }

    onChange("")
    onFileSelect?.(null)
    setPreview(null)
  }

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={fileInputId}>{label}</Label> : null}

      {preview && (
        <div className="relative h-48 w-full overflow-hidden rounded-lg border bg-muted">
          <Image
            src={preview}
            alt={previewAlt(label)}
            fill
            unoptimized
            className="object-contain"
            onError={() => setPreview(null)}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8"
            onClick={handleRemove}
            disabled={uploading}
            aria-label={removeLabel(label)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Subiendo...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Subir Imagen
          </>
        )}
      </Button>

      <input
        ref={fileInputRef}
        id={fileInputId}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        onChange={handleFileSelect}
        className="sr-only"
      />

      {allowUrlInput && (
        <div className="space-y-2">
          <Label htmlFor={urlInputId} className="text-sm font-medium">
            O pegar URL existente
          </Label>
          <Input
            id={urlInputId}
            value={value}
            placeholder="https://..."
            onChange={(event) => {
              onFileSelect?.(null)
              onChange(event.target.value)
            }}
          />
        </div>
      )}

      <ImageFieldHints maxSizeMB={maxSizeMB} recommendedSize={recommendedSize}>
        {deferUpload ? <p>Vista previa inmediata. El archivo se sube al guardar.</p> : null}
      </ImageFieldHints>
    </div>
  )
}

function MultiImageField({
  values,
  onChange,
  label = "Imágenes",
  maxImages,
  context,
  maxSizeMB = DEFAULT_MAX_IMAGE_SIZE_MB,
  recommendedSize,
  resetToken = 0,
}: MultiImageUploadProps) {
  const fileInputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const replaceIndexRef = useRef<number | null>(null)
  const resetTokenRef = useRef(resetToken)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [failedIndexes, setFailedIndexes] = useState<Set<number>>(new Set())
  const [previousValues, setPreviousValues] = useState(values)

  useEffect(() => {
    resetTokenRef.current = resetToken
  }, [resetToken])

  if (values !== previousValues) {
    setPreviousValues(values)
    setFailedIndexes(new Set())
  }

  const uploadFiles = async (files: File[], replaceIndex: number | null) => {
    const uploadResetToken = resetTokenRef.current
    const isReplacement = replaceIndex !== null
    const selectedFiles = isReplacement ? files.slice(0, 1) : files
    let nextValues = [...values]
    let uploadedCount = 0

    for (const file of selectedFiles) {
      const rejection =
        validateImageFile(file, maxSizeMB) ??
        limitRejection({ file, nextValues, maxImages, enforceLimit: !isReplacement })

      if (rejection) {
        toast.error(rejection)
        continue
      }

      const uploadIndex = replaceIndex ?? nextValues.length
      setUploadingIndex(uploadIndex)

      try {
        const result = await uploadImage(file, context, maxSizeMB)

        if (uploadResetToken !== resetTokenRef.current) return

        const uploadedUrl = result.url
        if (!result.success || !uploadedUrl) {
          toast.error(`${file.name}: ${result.error || UPLOAD_ERROR_MESSAGE}`)
          continue
        }

        nextValues = isReplacement
          ? nextValues.map((url, urlIndex) => (urlIndex === replaceIndex ? uploadedUrl : url))
          : [...nextValues, uploadedUrl].slice(0, maxImages)

        onChange(nextValues)
        uploadedCount++
      } catch (error) {
        console.error("[ImageUpload] Error al subir:", error)
        toast.error(`${file.name}: ${UPLOAD_ERROR_MESSAGE.toLowerCase()}`)
      } finally {
        setUploadingIndex(null)
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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const replaceIndex = replaceIndexRef.current
    replaceIndexRef.current = null
    event.target.value = ""

    if (files.length > 0) {
      await uploadFiles(files, replaceIndex)
    }
  }

  const openFilePicker = (replaceIndex: number | null) => {
    replaceIndexRef.current = replaceIndex
    fileInputRef.current?.click()
  }

  const handleRemove = async (index: number) => {
    const imageToRemove = values[index]

    if (imageToRemove && isStoredImageUrl(imageToRemove)) {
      await removeStoredImage(imageToRemove)
    }

    onChange(values.filter((_, imageIndex) => imageIndex !== index))
  }

  const canAddMore = values.length < maxImages

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Label htmlFor={fileInputId}>
          {label} ({values.length}/{maxImages})
        </Label>
        <div>
          <input
            ref={fileInputRef}
            id={fileInputId}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            multiple
            className="sr-only"
            onChange={handleFileSelect}
            disabled={!canAddMore}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => openFilePicker(null)}
            disabled={!canAddMore}
          >
            <Upload className="mr-2 h-4 w-4" />
            Seleccionar imágenes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {Array.from({ length: maxImages }).map((_, index) => (
          <ImageSlot
            key={index}
            index={index}
            imageUrl={values[index]}
            hasFailed={failedIndexes.has(index)}
            isUploading={uploadingIndex === index}
            canAddMore={canAddMore}
            onLoadError={() => setFailedIndexes((previous) => new Set(previous).add(index))}
            onRemove={() => handleRemove(index)}
            onReplace={() => openFilePicker(index)}
          />
        ))}
      </div>

      <ImageFieldHints maxSizeMB={maxSizeMB} recommendedSize={recommendedSize} />
    </div>
  )
}

function ImageSlot({
  index,
  imageUrl,
  hasFailed,
  isUploading,
  canAddMore,
  onLoadError,
  onRemove,
  onReplace,
}: {
  index: number
  imageUrl?: string
  hasFailed: boolean
  isUploading: boolean
  canAddMore: boolean
  onLoadError: () => void
  onRemove: () => void
  onReplace: () => void
}) {
  const slotLabel = `Imagen ${index + 1}`

  if (!imageUrl) {
    return (
      <ImageSlotFrame>
        <div className="flex h-full flex-col items-center justify-center p-2">
          {isUploading ? (
            <>
              <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Subiendo...</span>
            </>
          ) : canAddMore ? (
            <>
              <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="text-center text-xs text-muted-foreground">{slotLabel}</span>
            </>
          ) : (
            <span className="text-center text-xs text-muted-foreground">Límite alcanzado</span>
          )}
        </div>
      </ImageSlotFrame>
    )
  }

  return (
    <ImageSlotFrame>
      {hasFailed ? (
        <div className="flex h-full flex-col items-center justify-center p-2 text-muted-foreground">
          <ImageOff className="mb-2 h-8 w-8" />
          <span className="text-center text-xs">No se pudo cargar</span>
        </div>
      ) : (
        <Image
          src={imageUrl}
          alt={slotLabel}
          fill
          unoptimized
          className="object-cover"
          onError={onLoadError}
        />
      )}
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute right-2 top-2 h-8 w-8"
        onClick={onRemove}
        disabled={isUploading}
        aria-label={`Eliminar ${slotLabel.toLowerCase()}`}
      >
        <X className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="absolute bottom-2 left-2 right-2"
        onClick={onReplace}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Subiendo...
          </>
        ) : (
          "Reemplazar"
        )}
      </Button>
    </ImageSlotFrame>
  )
}

function ImageSlotFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-lg border-2 border-dashed bg-muted">
      {children}
    </div>
  )
}

function ImageFieldHints({
  maxSizeMB,
  recommendedSize,
  children,
}: {
  maxSizeMB: number
  recommendedSize?: RecommendedSize
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <p>
        <span className="font-medium">Tipos de archivo permitidos:</span>{" "}
        {ALLOWED_IMAGE_TYPE_LABELS.join(", ")}
      </p>
      {recommendedSize && (
        <p>
          <span className="font-medium">Dimensiones recomendadas:</span> {recommendedSize.width}px ×{" "}
          {recommendedSize.height}px
        </p>
      )}
      <p>Tamaño máximo: {maxSizeMB}MB</p>
      {children}
    </div>
  )
}

function limitRejection({
  file,
  nextValues,
  maxImages,
  enforceLimit,
}: {
  file: File
  nextValues: string[]
  maxImages: number
  enforceLimit: boolean
}): string | null {
  if (!enforceLimit || nextValues.length < maxImages) return null

  return `${file.name}: solo se permiten máximo ${maxImages} imágenes`
}

async function removeStoredImage(url: string) {
  try {
    const result = await deleteImage(url)

    if (!result.success) {
      toast.error(result.error || DELETE_ERROR_MESSAGE)
      return
    }

    toast.success("Imagen eliminada")
  } catch (error) {
    console.error("[ImageUpload] Error al eliminar:", error)
    toast.error(DELETE_ERROR_MESSAGE)
  }
}

function showLocalPreview(file: File, setPreview: (dataUrl: string) => void) {
  const reader = new FileReader()
  reader.onloadend = () => setPreview(reader.result as string)
  reader.readAsDataURL(file)
}

function previewAlt(label: string): string {
  return label ? `Vista previa de ${label.toLowerCase()}` : "Vista previa"
}

function removeLabel(label: string): string {
  return label ? `Quitar ${label.toLowerCase()}` : "Quitar imagen"
}
