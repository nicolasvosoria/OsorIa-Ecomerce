import { getSupabaseBrowserClient } from "./client"
import type { UserRole } from "@/lib/types/user"

/**
 * Verifica si el usuario actual es administrador
 * @returns true si el usuario es administrador, false en caso contrario
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.warn("[Permissions] Supabase no configurado")
    return false
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return false
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("[Permissions] Error al verificar rol:", error)
      return false
    }

    return data?.role === "admin"
  } catch (error) {
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("[Permissions] Error al obtener rol:", error)
      return null
    }

    return (data?.role as UserRole) || "user"
  } catch (error) {
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
