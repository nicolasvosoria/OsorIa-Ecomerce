import { getSupabaseBrowserClient } from "./client"
import { isCurrentUserAdmin } from "./permissions-api"

const BUCKET_NAME = "component-images"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB por defecto
const MAX_PRODUCT_IMAGE_SIZE = 1 * 1024 * 1024 // 1MB para imágenes de productos
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]

export interface UploadImageResult {
  success: boolean
  url?: string
  error?: string
}

/**
 * Sube una imagen a Supabase Storage
 * @param file - Archivo de imagen a subir
 * @param context - Contexto nemotécnico (ej: "hero-banner", "featured-product", "popular-item")
 * @param path - Ruta donde guardar la imagen (opcional, se genera automáticamente con contexto si no se proporciona)
 * @returns URL pública de la imagen o error
 */
export async function uploadImage(
  file: File,
  context?: string,
  path?: string
): Promise<UploadImageResult> {
  try {
    // Verificar permisos de administrador
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return {
        success: false,
        error: "Acceso denegado: Se requieren permisos de administrador",
      }
    }

    // Validar tipo de archivo
    if (!ALLOWED_TYPES.includes(file.type)) {
      return {
        success: false,
        error: `Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_TYPES.join(", ")}`,
      }
    }

    // Validar tamaño - Si es contexto de productos, usar límite de 1MB
    const isProductContext = context && (
      context.includes("product") || 
      context.includes("item") ||
      context === "product-images"
    )
    const maxSize = isProductContext ? MAX_PRODUCT_IMAGE_SIZE : MAX_FILE_SIZE
    const maxSizeMB = isProductContext ? 1 : 5

    if (file.size > maxSize) {
      return {
        success: false,
        error: `El archivo es demasiado grande. Tamaño máximo permitido: ${maxSizeMB}MB (${(file.size / 1024 / 1024).toFixed(2)}MB seleccionado)`,
      }
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: "Supabase no configurado",
      }
    }

    // Generar nombre único para el archivo con clave nemotécnica
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 10)
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg"
    
    // Limpiar contexto para usar como prefijo (solo letras, números y guiones)
    const cleanContext = context 
      ? context.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
      : "image"
    
    // Generar nombre: {contexto}-{timestamp}-{random}.{ext}
    const fileName = path || `${cleanContext}-${timestamp}-${randomString}.${fileExtension}`

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false, // No sobrescribir archivos existentes
      })

    if (error) {
      console.error("[Storage] Error al subir imagen:", error)
      return {
        success: false,
        error: error.message || "Error al subir la imagen",
      }
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)

    return {
      success: true,
      url: publicUrl,
    }
  } catch (error) {
    console.error("[Storage] Error completo:", error)
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }
    return {
      success: false,
      error: "Error desconocido al subir la imagen",
    }
  }
}

/**
 * Elimina una imagen de Supabase Storage
 * @param path - Ruta del archivo a eliminar
 * @returns true si se eliminó correctamente, false en caso contrario
 */
export async function deleteImage(path: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar permisos de administrador
    const isAdmin = await isCurrentUserAdmin()
    if (!isAdmin) {
      return {
        success: false,
        error: "Acceso denegado: Se requieren permisos de administrador",
      }
    }

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: "Supabase no configurado",
      }
    }

    // Extraer el nombre del archivo de la URL si es una URL completa
    let fileName = path
    if (path.includes("/storage/v1/object/public/")) {
      const parts = path.split("/")
      fileName = parts[parts.length - 1]
    }

    const { error } = await supabase.storage.from(BUCKET_NAME).remove([fileName])

    if (error) {
      console.error("[Storage] Error al eliminar imagen:", error)
      return {
        success: false,
        error: error.message || "Error al eliminar la imagen",
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error("[Storage] Error completo:", error)
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      }
    }
    return {
      success: false,
      error: "Error desconocido al eliminar la imagen",
    }
  }
}

/**
 * Obtiene la URL pública de una imagen
 * @param path - Ruta del archivo
 * @returns URL pública de la imagen
 */
export function getImageUrl(path: string): string {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return path // Retornar la ruta original si Supabase no está configurado
  }

  // Si ya es una URL completa, retornarla
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }

  // Extraer el nombre del archivo si es una URL de Supabase
  let fileName = path
  if (path.includes("/storage/v1/object/public/")) {
    const parts = path.split("/")
    fileName = parts[parts.length - 1]
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName)

  return publicUrl
}

