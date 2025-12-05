import type { UserProfile, AuthResult } from '@/lib/types/user'
import { getSupabaseBrowserClient } from './client'

// Helper para manejar timeouts
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

/**
 * Registrar un nuevo usuario
 */
export async function signUp(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string
): Promise<AuthResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    const { data, error } = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || '',
            last_name: lastName || '',
          },
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      }),
      15000,
      'signUp'
    )

    if (error) {
      console.error('[Auth] Error al registrar usuario:', error)
      return {
        success: false,
        error: error.message || 'Error al crear la cuenta',
      }
    }

    // El perfil se crea automáticamente con el trigger
    // Intentar obtener el perfil después de un breve delay
    let userProfile: UserProfile | undefined
    if (data.user) {
      // Esperar un momento para que el trigger se ejecute
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const profileResult = await getUserProfile(data.user.id)
      if (profileResult.success && profileResult.user) {
        userProfile = profileResult.user
      } else {
        // Si el trigger no funcionó, crear el perfil manualmente
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            email: data.user.email || email,
            first_name: firstName || null,
            last_name: lastName || null,
          })

        if (!insertError) {
          userProfile = {
            id: data.user.id,
            email: data.user.email || email,
            first_name: firstName || null,
            last_name: lastName || null,
          }
        }
      }
    }

    return {
      success: true,
      user: userProfile,
      emailSent: data.session === null, // Si no hay sesión, se envió email de confirmación
    }
  } catch (error: any) {
    console.error('[Auth] Error inesperado al registrar:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al crear la cuenta',
    }
  }
}

/**
 * Iniciar sesión
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
      15000,
      'signIn'
    )

    if (error) {
      console.error('[Auth] Error al iniciar sesión:', error)
      return {
        success: false,
        error: error.message || 'Error al iniciar sesión',
      }
    }

    if (!data.user) {
      return {
        success: false,
        error: 'No se pudo obtener la información del usuario',
      }
    }

    // Obtener el perfil del usuario
    const profileResult = await getUserProfile(data.user.id)
    if (!profileResult.success || !profileResult.user) {
      // Si no existe perfil, crearlo
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: data.user.email || email,
          first_name: null,
          last_name: null,
        })

      if (insertError) {
        console.error('[Auth] Error al crear perfil:', insertError)
      }

      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          first_name: null,
          last_name: null,
        },
      }
    }

    return {
      success: true,
      user: profileResult.user,
    }
  } catch (error: any) {
    console.error('[Auth] Error inesperado al iniciar sesión:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al iniciar sesión',
    }
  }
}

/**
 * Cerrar sesión
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }
    const { error } = await withTimeout(
      supabase.auth.signOut(),
      10000,
      'signOut'
    )

    if (error) {
      console.error('[Auth] Error al cerrar sesión:', error)
      return {
        success: false,
        error: error.message || 'Error al cerrar sesión',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[Auth] Error inesperado al cerrar sesión:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al cerrar sesión',
    }
  }
}

/**
 * Obtener el usuario actual
 */
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }
    const { data: { user }, error } = await withTimeout(
      supabase.auth.getUser(),
      10000,
      'getCurrentUser'
    )

    if (error || !user) {
      return {
        success: false,
        error: error?.message || 'No hay usuario autenticado',
      }
    }

    const profileResult = await getUserProfile(user.id)
    if (!profileResult.success || !profileResult.user) {
      return {
        success: false,
        error: 'No se pudo obtener el perfil del usuario',
      }
    }

    return {
      success: true,
      user: profileResult.user,
    }
  } catch (error: any) {
    console.error('[Auth] Error al obtener usuario actual:', error)
    return {
      success: false,
      error: error.message || 'Error al obtener usuario actual',
    }
  }
}

/**
 * Obtener perfil de usuario
 */
export async function getUserProfile(userId: string): Promise<AuthResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }
    const { data, error } = await withTimeout(
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single(),
      10000,
      'getUserProfile'
    )

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Perfil no encontrado',
      }
    }

    return {
      success: true,
      user: data as UserProfile,
    }
  } catch (error: any) {
    console.error('[Auth] Error al obtener perfil:', error)
    return {
      success: false,
      error: error.message || 'Error al obtener perfil',
    }
  }
}

/**
 * Actualizar perfil de usuario
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'first_name' | 'last_name'>>
): Promise<AuthResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }
    const { data, error } = await withTimeout(
      supabase
        .from('user_profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single(),
      10000,
      'updateUserProfile'
    )

    if (error || !data) {
      return {
        success: false,
        error: error?.message || 'Error al actualizar perfil',
      }
    }

    return {
      success: true,
      user: data as UserProfile,
    }
  } catch (error: any) {
    console.error('[Auth] Error al actualizar perfil:', error)
    return {
      success: false,
      error: error.message || 'Error al actualizar perfil',
    }
  }
}

/**
 * Reenviar email de confirmación
 */
export async function resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }
    const { error } = await withTimeout(
      supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
        },
      }),
      10000,
      'resendConfirmationEmail'
    )

    if (error) {
      return {
        success: false,
        error: error.message || 'Error al reenviar correo',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[Auth] Error al reenviar correo:', error)
    return {
      success: false,
      error: error.message || 'Error al reenviar correo',
    }
  }
}

/**
 * Escuchar cambios en el estado de autenticación
 */
export function onAuthStateChange(callback: (user: UserProfile | null) => void) {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    console.error('[Auth] Supabase no configurado, no se puede escuchar cambios de autenticación')
    // Retornar un objeto compatible con el tipo esperado
    const noop = () => {}
    return {
      data: {
        subscription: {
          unsubscribe: noop,
        },
      },
    }
  }
  
  let isProcessing = false
  
  return supabase.auth.onAuthStateChange(async (event, session) => {
    // Evitar procesar múltiples eventos simultáneamente
    if (isProcessing) {
      console.log("[Auth] Evento de autenticación ignorado (ya procesando):", event)
      return
    }
    
    isProcessing = true
    
    try {
      if (session?.user) {
        const profileResult = await getUserProfile(session.user.id)
        callback(profileResult.success && profileResult.user ? profileResult.user : null)
      } else {
        callback(null)
      }
    } catch (error) {
      console.error("[Auth] Error en onAuthStateChange:", error)
      callback(null)
    } finally {
      // Permitir procesar el siguiente evento después de un breve delay
      setTimeout(() => {
        isProcessing = false
      }, 100)
    }
  })
}

