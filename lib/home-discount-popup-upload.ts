export const HOME_DISCOUNT_POPUP_UPLOAD_BUCKET = "marketing-assets";
export const HOME_DISCOUNT_POPUP_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_HOME_DISCOUNT_POPUP_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function padTimestampSegment(value: number, size = 2): string {
  return String(value).padStart(size, "0");
}

function normalizeFileExtension(fileName: string): string {
  const extension = fileName.split(".").pop()?.toLowerCase().trim() || "jpg";
  return extension.replace(/[^a-z0-9]/g, "") || "jpg";
}

function sanitizePathSegment(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "store"
  );
}

export function validateHomeDiscountPopupUpload(input: {
  type: string;
  size: number;
}) {
  if (!ALLOWED_HOME_DISCOUNT_POPUP_IMAGE_TYPES.has(input.type)) {
    return {
      valid: false as const,
      error:
        "Tipo de archivo no permitido. Solo se permiten JPG, PNG, WEBP y GIF.",
    };
  }

  if (input.size > HOME_DISCOUNT_POPUP_UPLOAD_MAX_BYTES) {
    return {
      valid: false as const,
      error: "El archivo es demasiado grande. Tamaño máximo permitido: 5MB.",
    };
  }

  return { valid: true as const };
}

export function buildHomeDiscountPopupUploadPath(
  storeId: string,
  fileName: string,
  now = new Date(),
  randomId = crypto.randomUUID().slice(0, 8),
): string {
  const timestamp =
    `${now.getUTCFullYear()}` +
    `${padTimestampSegment(now.getUTCMonth() + 1)}` +
    `${padTimestampSegment(now.getUTCDate())}` +
    `T${padTimestampSegment(now.getUTCHours())}` +
    `${padTimestampSegment(now.getUTCMinutes())}` +
    `${padTimestampSegment(now.getUTCSeconds())}` +
    `${padTimestampSegment(now.getUTCMilliseconds(), 3)}Z`;

  return [
    "home-discount-popup",
    sanitizePathSegment(storeId),
    `${timestamp}-${randomId}.${normalizeFileExtension(fileName)}`,
  ].join("/");
}
