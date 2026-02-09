import { getSupabaseBrowserClient } from "./client"
import type { UserRole } from "@/lib/types/user"

// Helper para manejar timeouts
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  operation: string = 'operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms en ${operation}`)), timeoutMs)
    ),
  ])
}

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
    // Obtener usuario con reintentos y timeout más largo
    let user: any = null
    let getUserError: any = null
    const maxGetUserRetries = 2 // 2 reintentos para getUser
    const getUserTimeoutMs = 15000 // 15 segundos para getUser también

    for (let getUserAttempt = 0; getUserAttempt <= maxGetUserRetries; getUserAttempt++) {
      try {
        if (getUserAttempt > 0) {
          console.log(`[Permissions] Reintento ${getUserAttempt} de obtener usuario...`)
          await new Promise(resolve => setTimeout(resolve, 500 * getUserAttempt))
        }

        const getUserResult = await withTimeout(
          supabase.auth.getUser(),
          getUserTimeoutMs,
          `getUser en isCurrentUserAdmin (intento ${getUserAttempt + 1})`
        ) as { data: { user: any } | null; error: any }

        if (getUserResult.data?.user) {
          user = getUserResult.data.user
          break // Usuario obtenido exitosamente
        }

        if (getUserResult.error) {
          getUserError = getUserResult.error
          // Si no es el último intento, continuar
          if (getUserAttempt < maxGetUserRetries) {
            continue
          }
        } else {
          // No hay usuario y no hay error explícito
          return false
        }
      } catch (timeoutError: any) {
        console.warn(`[Permissions] Timeout en intento ${getUserAttempt + 1} de obtener usuario:`, timeoutError.message)
        getUserError = timeoutError
        // Si es el último intento, salir del loop
        if (getUserAttempt >= maxGetUserRetries) {
          break
        }
      }
    }

    // Si no se pudo obtener el usuario después de todos los intentos
    if (!user) {
      if (getUserError?.message?.includes('timeout') || getUserError?.message?.includes('Timeout')) {
        console.warn("[Permissions] Timeout al obtener usuario después de todos los intentos. No se puede verificar si es admin.")
        // Lanzar error para que el contexto lo maneje como timeout
        throw new Error("Timeout al obtener usuario")
      }
      return false
    }

    // Configuración de reintentos y timeout
    let lastError: any = null
    const maxRetries = 2 // 2 reintentos (3 intentos en total)
    const timeoutMs = 15000 // 15 segundos para dar más tiempo a la conexión

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Permissions] Reintento ${attempt} de verificar rol de admin...`)
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
        }

        // Consultar perfil con timeout
        const queryPromise = supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        const result = await withTimeout(
          queryPromise,
          timeoutMs,
          `isCurrentUserAdmin (intento ${attempt + 1})`
        ) as { data: any; error: any }

        const { data, error } = result

        if (error) {
          // Si es un error de "no encontrado", retornar false (no es admin)
          if (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('not found')) {
            console.log("[Permissions] Perfil no encontrado, usuario no es admin")
            return false
          }

          // Si es un error de permisos o RLS, no reintentar
          if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')) {
            console.error("[Permissions] Error de permisos/RLS al verificar rol. Verifica la configuración de RLS en Supabase.")
            return false
          }

          lastError = error
          // Continuar con el siguiente intento si no es el último
          if (attempt < maxRetries) {
            continue
          }
        }

        if (!data) {
          return false
        }

        // Si llegamos aquí, la consulta fue exitosa
        const isAdmin = data?.role === "admin"
        if (isAdmin) {
          console.log("[Permissions] Usuario verificado como administrador")
        }
        return isAdmin
      } catch (timeoutError: any) {
        // Usar console.warn para timeouts, ya que es un error esperado y manejado
        console.warn(`[Permissions] Timeout en intento ${attempt + 1} de verificar rol:`, timeoutError.message)
        lastError = timeoutError

        // Si es el último intento, retornar false
        if (attempt >= maxRetries) {
          break
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    if (lastError?.message?.includes('timeout') || lastError?.message?.includes('Timeout')) {
      console.warn("[Permissions] Timeout al verificar rol después de todos los intentos.")
      // Lanzar error para que el contexto lo maneje como timeout (no cambiar estado)
      throw new Error("Timeout al verificar rol de admin")
    } else {
      console.error("[Permissions] Todos los intentos de verificar rol fallaron. Último error:", lastError?.message)
      // Por seguridad, retornar false si no se pudo verificar (error no timeout)
      return false
    }
  } catch (error: any) {
    // Si el error es un timeout, relanzarlo para que el contexto lo maneje
    if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
      throw error
    }
    console.error("[Permissions] Error inesperado al verificar permisos:", error)
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
    // Obtener usuario con reintentos y timeout más largo
    let user: any = null
    let getUserError: any = null
    const maxGetUserRetries = 2 // 2 reintentos para getUser
    const getUserTimeoutMs = 15000 // 15 segundos para getUser también

    for (let getUserAttempt = 0; getUserAttempt <= maxGetUserRetries; getUserAttempt++) {
      try {
        if (getUserAttempt > 0) {
          console.log(`[Permissions] Reintento ${getUserAttempt} de obtener usuario para rol...`)
          await new Promise(resolve => setTimeout(resolve, 500 * getUserAttempt))
        }

        const getUserResult = await withTimeout(
          supabase.auth.getUser(),
          getUserTimeoutMs,
          `getUser en getCurrentUserRole (intento ${getUserAttempt + 1})`
        ) as { data: { user: any } | null; error: any }

        if (getUserResult.data?.user) {
          user = getUserResult.data.user
          break // Usuario obtenido exitosamente
        }

        if (getUserResult.error) {
          getUserError = getUserResult.error
          // Si no es el último intento, continuar
          if (getUserAttempt < maxGetUserRetries) {
            continue
          }
        } else {
          // No hay usuario y no hay error explícito
          return null
        }
      } catch (timeoutError: any) {
        console.warn(`[Permissions] Timeout en intento ${getUserAttempt + 1} de obtener usuario para rol:`, timeoutError.message)
        getUserError = timeoutError
        // Si es el último intento, salir del loop
        if (getUserAttempt >= maxGetUserRetries) {
          break
        }
      }
    }

    // Si no se pudo obtener el usuario después de todos los intentos
    if (!user) {
      if (getUserError?.message?.includes('timeout') || getUserError?.message?.includes('Timeout')) {
        console.warn("[Permissions] Timeout al obtener usuario después de todos los intentos. No se puede obtener rol.")
        // Lanzar error para que el contexto lo maneje como timeout
        throw new Error("Timeout al obtener usuario")
      }
      return null
    }

    // Configuración de reintentos y timeout
    let lastError: any = null
    const maxRetries = 2 // 2 reintentos (3 intentos en total)
    const timeoutMs = 15000 // 15 segundos para dar más tiempo a la conexión

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Permissions] Reintento ${attempt} de obtener rol...`)
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
        }

        // Consultar perfil con timeout
        const queryPromise = supabase
          .from("user_profiles")
          .select("role")
          .eq("id", user.id)
          .single()

        const result = await withTimeout(
          queryPromise,
          timeoutMs,
          `getCurrentUserRole (intento ${attempt + 1})`
        ) as { data: any; error: any }

        const { data, error } = result

        if (error) {
          // Si es un error de "no encontrado", retornar "user" como default
          if (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('not found')) {
            console.log("[Permissions] Perfil no encontrado, retornando 'user' como default")
            return "user"
          }

          // Si es un error de permisos o RLS, no reintentar
          if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')) {
            console.error("[Permissions] Error de permisos/RLS al obtener rol. Verifica la configuración de RLS en Supabase.")
            return null
          }

          lastError = error
          // Continuar con el siguiente intento si no es el último
          if (attempt < maxRetries) {
            continue
          }
        }

        if (!data) {
          return "user" // Default a "user" si no hay datos
        }

        // Si llegamos aquí, la consulta fue exitosa
        const role = (data?.role as UserRole) || "user"
        console.log(`[Permissions] Rol obtenido: ${role}`)
        return role
      } catch (timeoutError: any) {
        // Usar console.warn para timeouts, ya que es un error esperado y manejado
        console.warn(`[Permissions] Timeout en intento ${attempt + 1} de obtener rol:`, timeoutError.message)
        lastError = timeoutError

        // Si es el último intento, retornar null
        if (attempt >= maxRetries) {
          break
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    if (lastError?.message?.includes('timeout') || lastError?.message?.includes('Timeout')) {
      console.warn("[Permissions] Timeout al obtener rol después de todos los intentos.")
      // Lanzar error para que el contexto lo maneje como timeout (no cambiar estado)
      throw new Error("Timeout al obtener rol")
    } else {
      console.error("[Permissions] Todos los intentos de obtener rol fallaron. Último error:", lastError?.message)
      // Retornar null si no se pudo obtener el rol (error no timeout)
      return null
    }
  } catch (error: any) {
    // Si el error es un timeout, relanzarlo para que el contexto lo maneje
    if (error?.message?.includes('timeout') || error?.message?.includes('Timeout')) {
      throw error
    }
    console.error("[Permissions] Error inesperado al obtener rol:", error)
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
