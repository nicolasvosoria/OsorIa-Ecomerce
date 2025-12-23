import type { UserProfile, AuthResult } from '@/lib/types/user'
import { getSupabaseBrowserClient } from './client'
import { getUrl } from '@/lib/utils/url'

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

    const result = await withTimeout(
      supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName || '',
            last_name: lastName || '',
          },
          emailRedirectTo: getUrl('/auth/callback'),
        },
      }),
      15000,
      'signUp'
    ) as { data: { user: any; session: any } | null; error: any }
    const { data, error } = result

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
    if (data?.user) {
      // Esperar un momento para que el trigger se ejecute
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const profileResult = await getUserProfile(data.user!.id)
      if (profileResult.success && profileResult.user) {
        userProfile = profileResult.user
      } else {
        // Si el trigger no funcionó, crear el perfil manualmente
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user!.id,
            email: data.user!.email || email,
            first_name: firstName || null,
            last_name: lastName || null,
          })

        if (!insertError) {
          userProfile = {
            id: data.user!.id,
            email: data.user!.email || email,
            first_name: firstName || null,
            last_name: lastName || null,
          }
        }
      }
    }

    return {
      success: true,
      user: userProfile,
      emailSent: data?.session === null, // Si no hay sesión, se envió email de confirmación
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

    const result = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
      15000,
      'signIn'
    ) as { data: { user: any; session: any } | null; error: any }
    const { data, error } = result

    if (error) {
      console.error('[Auth] Error al iniciar sesión:', error)
      return {
        success: false,
        error: error.message || 'Error al iniciar sesión',
      }
    }

    if (!data?.user) {
      return {
        success: false,
        error: 'No se pudo obtener la información del usuario',
      }
    }

    // Obtener el perfil del usuario
    const profileResult = await getUserProfile(data.user!.id)
    if (!profileResult.success || !profileResult.user) {
      // Si no existe perfil, crearlo
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user!.id,
          email: data.user!.email || email,
          first_name: null,
          last_name: null,
        })

      if (insertError) {
        console.error('[Auth] Error al crear perfil:', insertError)
      }

      return {
        success: true,
        user: {
          id: data.user!.id,
          email: data.user!.email || email,
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
    const result = await withTimeout(
      supabase.auth.signOut(),
      10000,
      'signOut'
    ) as { error: any }
    const { error } = result

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
    const result = await withTimeout(
      supabase.auth.getUser(),
      10000,
      'getCurrentUser'
    ) as { data: { user: any } | null; error: any }
    const resultData = result.data
    const user = resultData?.user || null
    const { error } = result

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
      console.warn('[Auth] Supabase no configurado')
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    console.log('[Auth] Obteniendo perfil para usuario:', userId)
    const startTime = Date.now()

    // Reducir reintentos y timeout para evitar esperas largas
    let lastError: any = null
    const maxRetries = 1 // Solo 1 reintento
    const timeoutMs = 8000 // Reducido a 8 segundos
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Auth] Reintento ${attempt} de obtener perfil...`)
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
        }

        const result = await withTimeout(
          supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single(),
          timeoutMs,
          `getUserProfile (intento ${attempt + 1})`
        ) as { data: any; error: any }

        const { data, error } = result
        const elapsedTime = Date.now() - startTime
        console.log(`[Auth] Consulta de perfil completada en ${elapsedTime}ms`)

        if (error) {
          console.error('[Auth] Error en consulta de perfil:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          })
          
          // Si es un error de "no encontrado", intentar crear el perfil
          if (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('not found')) {
            console.log('[Auth] Perfil no encontrado, intentando crear perfil automáticamente...')
            
            // Obtener el usuario de auth para crear el perfil
            const { data: { user: authUser } } = await supabase.auth.getUser()
            
            if (authUser && authUser.id === userId) {
              // Intentar crear el perfil
              const { data: newProfile, error: insertError } = await supabase
                .from('user_profiles')
                .insert({
                  id: userId,
                  email: authUser.email || '',
                  first_name: authUser.user_metadata?.first_name || null,
                  last_name: authUser.user_metadata?.last_name || null,
                })
                .select()
                .single()

              if (!insertError && newProfile) {
                console.log('[Auth] Perfil creado automáticamente')
                return {
                  success: true,
                  user: newProfile as UserProfile,
                }
              } else {
                console.error('[Auth] Error al crear perfil automáticamente:', insertError)
              }
            }
            
            // Si no se pudo crear, retornar error
            return {
              success: false,
              error: 'Perfil no encontrado y no se pudo crear automáticamente',
            }
          }
          
          // Si es un error de permisos o RLS, no reintentar
          if (error.code === '42501' || error.message?.includes('permission') || error.message?.includes('RLS')) {
            console.error('[Auth] Error de permisos/RLS en user_profiles. Verifica que RLS esté deshabilitado o las políticas estén configuradas correctamente.')
            return {
              success: false,
              error: 'Error de permisos al acceder al perfil. Verifica la configuración de RLS en Supabase.',
            }
          }
          
          lastError = error
          // Continuar con el siguiente intento si no es el último
          if (attempt < maxRetries) {
            continue
          }
        }

        if (!data) {
          return {
            success: false,
            error: 'Perfil no encontrado',
          }
        }

        console.log('[Auth] Perfil obtenido exitosamente')
        return {
          success: true,
          user: data as UserProfile,
        }
      } catch (timeoutError: any) {
        const elapsedTime = Date.now() - startTime
        console.error(`[Auth] Timeout después de ${elapsedTime}ms en intento ${attempt + 1}:`, timeoutError.message)
        lastError = timeoutError
        
        // Si es el último intento, retornar error
        if (attempt >= maxRetries) {
          break
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error('[Auth] Todos los intentos de obtener perfil fallaron. Último error:', lastError?.message)
    
    // Proporcionar un mensaje más útil
    let errorMessage = 'Error al obtener perfil: timeout o error de conexión'
    if (lastError?.message) {
      if (lastError.message.includes('timeout') || lastError.message.includes('Timeout')) {
        errorMessage = 'Timeout al conectar con Supabase. Verifica tu conexión a internet y que Supabase esté disponible.'
      } else {
        errorMessage = lastError.message
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    }
  } catch (error: any) {
    console.error('[Auth] Error inesperado al obtener perfil:', error)
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
    const result = await withTimeout(
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
    ) as { data: any; error: any }
    const { data, error } = result

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
    const result = await withTimeout(
      supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: getUrl('/auth/callback'),
        },
      }),
      10000,
      'resendConfirmationEmail'
    ) as { error: any }
    const { error } = result

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
 * Enviar email de recuperación de contraseña
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    const result = await withTimeout(
      supabase.auth.resetPasswordForEmail(email, {
        emailRedirectTo: getUrl('/auth/reset-password'),
      }),
      10000,
      'resetPassword'
    ) as { error: any }
    const { error } = result

    if (error) {
      console.error('[Auth] Error al enviar email de recuperación:', error)
      return {
        success: false,
        error: error.message || 'Error al enviar email de recuperación',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[Auth] Error inesperado al enviar email de recuperación:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al enviar email de recuperación',
    }
  }
}

/**
 * Actualizar contraseña con token de recuperación
 */
export async function updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    const result = await withTimeout(
      supabase.auth.updateUser({
        password: newPassword,
      }),
      10000,
      'updatePassword'
    ) as { error: any }
    const { error } = result

    if (error) {
      console.error('[Auth] Error al actualizar contraseña:', error)
      return {
        success: false,
        error: error.message || 'Error al actualizar contraseña',
      }
    }

    return { success: true }
  } catch (error: any) {
    console.error('[Auth] Error inesperado al actualizar contraseña:', error)
    return {
      success: false,
      error: error.message || 'Error inesperado al actualizar contraseña',
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
  
  return supabase.auth.onAuthStateChange(async (event: string, session: any) => {
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

