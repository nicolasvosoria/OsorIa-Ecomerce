import { DEFAULT_MAX_IMAGE_SIZE_MB, validateImageFile } from "@/lib/images/image-file";
import { getSupabaseBrowserClient } from "./client";
import { ECOMMERCE_STORAGE_BUCKETS } from "./contract";
import { isCurrentUserAdmin } from "./permissions-api";

const BUCKET_NAME = ECOMMERCE_STORAGE_BUCKETS.products;
const PUBLIC_OBJECT_URL_MARKER = `/storage/v1/object/public/${BUCKET_NAME}/`;

export interface UploadImageRequest {
  file: File;
  storeId: string;
  context?: string;
  maxSizeMB?: number;
}

export interface UploadImageResult {
  success: boolean;
  url?: string;
  error?: string;
}

export function isStoredImageUrl(url: string): boolean {
  return url.includes(PUBLIC_OBJECT_URL_MARKER);
}

function getStoragePath(path: string): string {
  if (!isStoredImageUrl(path)) {
    return path;
  }

  return path.split(PUBLIC_OBJECT_URL_MARKER)[1] || path;
}

export async function uploadImage({
  file,
  storeId,
  context,
  maxSizeMB = DEFAULT_MAX_IMAGE_SIZE_MB,
}: UploadImageRequest): Promise<UploadImageResult> {
  try {
    // Verificar permisos de administrador
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: "Acceso denegado: Se requieren permisos de administrador",
      };
    }

    const validationError = validateImageFile(file, maxSizeMB);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return {
        success: false,
        error: "Supabase no configurado",
      };
    }

    // Generar nombre único para el archivo con clave nemotécnica
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const fileExtension = file.name.split(".").pop()?.toLowerCase() || "jpg";

    // Limpiar contexto para usar como prefijo (solo letras, números y guiones)
    const cleanContext = context
      ? context
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
      : "image";

    // Generar nombre: {contexto}-{timestamp}-{random}.{ext}
    const objectName = `${cleanContext}-${timestamp}-${randomString}.${fileExtension}`;

    // Namespacing por tienda: las subidas viven bajo {store_id}/ para que la RLS
    // per-tienda (can_manage_store) aísle el storage entre tiendas. La tienda la
    // inyecta quien llama con el dato que el servidor autorizó, nunca el ambiente
    // del navegador: vacía significa que authorizeActiveStoreAdmin falló. La RLS
    // ya rechaza un path plano por su cuenta (solo lo admite is_storage_admin,
    // super_admin global) — pero como un error opaco de storage. Rechazar acá es
    // honesto: nombra el fallo de autorización en vez de disfrazarlo de intento
    // de escritura.
    if (!storeId) {
      return {
        success: false,
        error: "Acceso denegado: no hay una tienda activa para subir la imagen",
      };
    }

    const fileName = `${storeId}/${objectName}`;

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false, // No sobrescribir archivos existentes
      });

    if (error) {
      console.error("[Storage] Error al subir imagen:", error);
      return {
        success: false,
        error: error.message || "Error al subir la imagen",
      };
    }

    // Obtener URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

    return {
      success: true,
      url: publicUrl,
    };
  } catch (error) {
    console.error("[Storage] Error completo:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error desconocido al subir la imagen",
    };
  }
}

export async function deleteImage(
  path: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verificar permisos de administrador
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: "Acceso denegado: Se requieren permisos de administrador",
      };
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      return {
        success: false,
        error: "Supabase no configurado",
      };
    }

    // Extraer el nombre del archivo de la URL si es una URL completa
    const fileName = getStoragePath(path);

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      console.error("[Storage] Error al eliminar imagen:", error);
      return {
        success: false,
        error: error.message || "Error al eliminar la imagen",
      };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Storage] Error completo:", error);
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: "Error desconocido al eliminar la imagen",
    };
  }
}
