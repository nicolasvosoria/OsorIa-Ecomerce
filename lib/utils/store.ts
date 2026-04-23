/**
 * Obtiene el store_id del contexto actual
 * Funciona tanto en servidor como en cliente
 * Usa importación dinámica para evitar errores de importación
 *
 * IMPORTANTE: Durante build time (generateStaticParams, etc.), retorna null
 * para evitar errores. Las funciones que usen esto deben manejar el caso null.
 */
const SYMBOLIC_DEFAULT_STORE_ID = "default";

export function normalizeRuntimeStoreId(
  candidate: string | null | undefined,
): string | null {
  if (!candidate) return null;
  const normalized = candidate.trim();
  if (!normalized) return null;
  if (normalized.toLowerCase() === SYMBOLIC_DEFAULT_STORE_ID) return null;
  return normalized;
}

export function resolveScopedStorageKey(
  baseKey: string,
  storeId: string | null | undefined,
): string | null {
  const resolvedStoreId = normalizeRuntimeStoreId(storeId);
  if (!resolvedStoreId) return null;
  return `${baseKey}_${resolvedStoreId}`;
}

export async function getStoreId(): Promise<string | null> {
  // Si multi-tenant está deshabilitado, retornar store_id por defecto
  const disableMultiTenant =
    process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === "true";
  if (disableMultiTenant) {
    return process.env.DEFAULT_STORE_ID || "default";
  }

  // En el servidor, usar importación dinámica de next/headers
  if (typeof window === "undefined") {
    try {
      // Importación dinámica solo en el servidor
      const { cookies, headers } = await import("next/headers");

      // En Next.js 15+, headers() retorna una Promise
      const headersList = await headers();
      const storeId = headersList.get("x-store-id");
      if (storeId) return storeId;

      // Fallback: obtener de cookies
      const cookieStore = await cookies();
      const storeIdCookie = cookieStore.get("store_id");
      if (storeIdCookie) return storeIdCookie.value;
    } catch (error: any) {
      // Si hay error (por ejemplo, durante prerendering o build time), retornar null
      // Esto permite que las funciones que usan esto manejen el caso de build time
      if (
        error?.message?.includes("prerender") ||
        error?.message?.includes("During prerendering") ||
        error?.message?.includes("outside a request scope") ||
        error?.message?.includes("cache scope")
      ) {
        // Durante build time, retornar null en lugar de 'default'
        // Las funciones que usen esto deben manejar null apropiadamente
        return null;
      }
      // Si el error es porque no se puede importar (en cliente), continuar
      if (error?.message?.includes("next/headers")) {
        return null;
      }
      console.warn("[Store] Error al obtener store_id del servidor:", error);
      return null;
    }
  } else {
    // En el cliente, obtener de cookies
    const cookies = document.cookie.split(";");
    const storeIdCookie = cookies.find((c) => c.trim().startsWith("store_id="));
    if (storeIdCookie) {
      return storeIdCookie.split("=")[1];
    }
  }

  // Fallback: retornar null en lugar de 'default'
  // Las funciones que usen esto deben obtener el UUID real de la tienda por defecto
  return null;
}

/**
 * Obtiene el store_id de forma síncrona (solo cliente)
 */
export function getStoreIdSync(): string | null {
  // Si multi-tenant está deshabilitado, retornar store_id por defecto
  const disableMultiTenant =
    process.env.NEXT_PUBLIC_DISABLE_SUBDOMAIN_MULTI_TENANT === "true";
  if (disableMultiTenant) {
    return process.env.NEXT_PUBLIC_DEFAULT_STORE_ID || "default";
  }

  if (typeof window === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  const storeIdCookie = cookies.find((c) => c.trim().startsWith("store_id="));
  if (storeIdCookie) {
    return storeIdCookie.split("=")[1];
  }

  return "default";
}

export async function getRuntimeStoreId(): Promise<string | null> {
  const storeId = await getStoreId();
  return normalizeRuntimeStoreId(storeId);
}

export function getRuntimeStoreIdSync(): string | null {
  return normalizeRuntimeStoreId(getStoreIdSync());
}

/**
 * Obtiene el subdominio del hostname actual
 */
export function getSubdomain(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const hostname = window.location.hostname;

  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    return "default";
  }

  const parts = hostname.split(".");

  if (parts.length >= 2) {
    const subdomain = parts[0];
    if (subdomain === "www") {
      return parts.length > 2 ? parts[1] : null;
    }
    return subdomain;
  }

  return null;
}
