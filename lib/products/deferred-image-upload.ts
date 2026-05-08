import type { UploadImageResult } from '@/lib/supabase/storage-api'

export type DeferredImageUploadFn = (file: File, context: string) => Promise<UploadImageResult>
export type DeferredImageCleanupFn = (url: string) => Promise<{ success: boolean; error?: string }>

export interface ResolveDeferredImageInput {
  file?: File | null
  imageUrl?: string | null
  context?: string
  uploadImage: DeferredImageUploadFn
}

export interface ResolveDeferredImageResult {
  imageUrl?: string
  uploadedUrl?: string
}

export async function resolveDeferredImageUpload({
  file,
  imageUrl,
  context = 'product-images',
  uploadImage,
}: ResolveDeferredImageInput): Promise<ResolveDeferredImageResult> {
  if (!file) {
    const trimmedUrl = imageUrl?.trim()
    return { imageUrl: trimmedUrl || undefined }
  }

  const uploadResult = await uploadImage(file, context)
  if (!uploadResult.success || !uploadResult.url) {
    throw new Error(uploadResult.error || 'No se pudo subir la imagen del combo')
  }

  return {
    imageUrl: uploadResult.url,
    uploadedUrl: uploadResult.url,
  }
}

export async function cleanupDeferredUploadedImage(
  uploadedUrl: string | undefined,
  cleanupImage: DeferredImageCleanupFn,
): Promise<void> {
  if (!uploadedUrl) return

  try {
    await cleanupImage(uploadedUrl)
  } catch (error) {
    console.warn('[DeferredImageUpload] No se pudo limpiar la imagen subida después de fallar el guardado:', error)
  }
}
