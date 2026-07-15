const ALLOWED_IMAGE_MIME_TYPES: readonly string[] = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]

const BYTES_PER_MB = 1024 * 1024

export const IMAGE_UPLOAD_ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(",")

export const ALLOWED_IMAGE_TYPE_LABELS = ALLOWED_IMAGE_MIME_TYPES.map((mimeType) =>
  mimeType.replace("image/", "").toUpperCase(),
)

export const DEFAULT_MAX_IMAGE_SIZE_MB = 5

export function validateImageFile(file: File, maxSizeMB: number): string | null {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.type)) {
    return `${file.name}: selecciona un archivo de imagen válido (${ALLOWED_IMAGE_TYPE_LABELS.join(", ")})`
  }

  if (file.size > maxSizeMB * BYTES_PER_MB) {
    return `${file.name}: supera el máximo de ${maxSizeMB}MB (pesa ${toSizeInMB(file)}MB)`
  }

  return null
}

function toSizeInMB(file: File): string {
  return (file.size / BYTES_PER_MB).toFixed(2)
}
