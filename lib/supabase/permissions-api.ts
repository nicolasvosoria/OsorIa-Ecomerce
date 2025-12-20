import { getSupabaseBrowserClient } from "./client"
import type { UserRole } from "@/lib/types/user"

/**
 * Verifica si el usuario actual es administrador
 * @returns true si el usuario es administrador, false en caso contrario
 */
// Helper para timeout
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  operation: string = 'operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms en ${operation}`)), timeoutMs)
    ),
  ])
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.warn("[Permissions] Supabase no configurado")
    return false
  }

  try {
    // Usar timeout para evitar esperas indefinidas
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'getUser'
    )
    
    if (!user) {
      return false
    }

    // Consulta optimizada: solo seleccionar el campo 'role'
    const { data, error } = await withTimeout(
      supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single(),
      8000,
      'getUserRole'
    )

    if (error) {
      // Si el error es "no encontrado", no es admin
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return false
      }
      console.error("[Permissions] Error al verificar rol:", error)
      return false
    }

    return data?.role === "admin"
  } catch (error: any) {
    // Si es timeout, retornar false en lugar de lanzar error
    if (error.message?.includes('Timeout')) {
      console.warn("[Permissions] Timeout al verificar permisos, asumiendo no admin")
      return false
    }
    console.error("[Permissions] Error al verificar permisos:", error)
    return false
  }
}

/**
 * Obtiene el rol del usuario actual
 * @returns El rol del usuario ('user' o 'admin'), o null si no está autenticado
 */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.warn("[Permissions] Supabase no configurado")
    return null
  }

  try {
    const { data: { user } } = await withTimeout(
      supabase.auth.getUser(),
      5000,
      'getUser'
    )
    
    if (!user) {
      return null
    }

    const { data, error } = await withTimeout(
      supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single(),
      8000,
      'getUserRole'
    )

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
        return "user" // Rol por defecto si no existe perfil
      }
      console.error("[Permissions] Error al obtener rol:", error)
      return null
    }

    return (data?.role as UserRole) || "user"
  } catch (error: any) {
    if (error.message?.includes('Timeout')) {
      console.warn("[Permissions] Timeout al obtener rol")
      return null
    }
    console.error("[Permissions] Error al obtener rol:", error)
    return null
  }
}

/**
 * Requiere que el usuario sea administrador
 * Lanza un error si el usuario no es administrador
 * @throws Error si el usuario no es administrador
 */
export async function requireAdmin(): Promise<void> {
  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) {
    throw new Error("Acceso denegado: Se requieren permisos de administrador")
  }
}
