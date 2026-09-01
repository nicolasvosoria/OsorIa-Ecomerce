import type { AuthError, AuthTokenResponsePassword, UserResponse } from '@supabase/supabase-js'

import type { UserProfile, AuthResult } from '@/lib/types/user'
import { prepareAuthRedirect } from '@/lib/auth/prepare-auth-redirect'
import { getSupabaseBrowserClient, getSupabaseEcommerce } from './client'
import { ECOMMERCE_TABLES } from './contract'

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

// El mensaje genérico que cubre las cuatro razones por las que
// prepareAuthRedirect puede negarse (Turnstile, límite de envíos, tienda no
// resuelta, servicio no disponible): ninguna es información que el
// formulario deba distinguir para quien está registrándose.
const PREPARE_AUTH_REDIRECT_ERROR = 'No se pudo iniciar el registro. Intenta de nuevo en un momento.'

const PREPARE_RECOVERY_REDIRECT_ERROR =
  'No se pudo enviar el correo de recuperación de contraseña. Intenta de nuevo en un momento.'

/**
 * Registrar un nuevo usuario.
 *
 * D23: el perfil YA NO se crea aquí -- ni por un trigger (nunca existió,
 * D23's "known terrain") ni por el insert manual de reserva que este
 * archivo hacía antes tras esperar un segundo. Ese insert usaba
 * getRuntimeStoreId() para signup_store_id, la misma resolución por host que
 * D23 prohíbe como base de atribución: se ejecutaba justo después de crear
 * la cuenta, mucho antes de que la persona confirmara el correo, así que
 * ganaba SIEMPRE la carrera contra cualquier finalización hecha en el
 * callback. app/auth/callback/page.tsx (vía lib/auth/finalize-signup-action.ts)
 * es ahora el único lugar donde se crea el perfil, ligado al intent que
 * prepareAuthRedirect acaba de mintear -- idempotente, y sin la carrera.
 */
export async function signUp(
  email: string,
  password: string,
  firstName?: string,
  lastName?: string,
  turnstileToken: string | null = null,
): Promise<AuthResult> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    const prepared = await prepareAuthRedirect({ email, purpose: 'signup', path: '/auth/callback', turnstileToken })
    if (!prepared.ok) {
      return { success: false, error: PREPARE_AUTH_REDIRECT_ERROR }
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
          emailRedirectTo: prepared.redirectTo,
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

    return {
      success: true,
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

    const profileResult = await getUserProfile(data.user!.id)
    if (!profileResult.success || !profileResult.user) {
      const profilesClient = getSupabaseEcommerce()
      if (profilesClient) {
        const { error: insertError } = await profilesClient
          .from(ECOMMERCE_TABLES.userProfiles)
          .insert({
            id: data.user!.id,
            email: data.user!.email || email,
            first_name: null,
            last_name: null,
          })
        if (insertError) {
          console.error('[Auth] Error al crear perfil:', insertError)
        }
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
    const authClient = getSupabaseBrowserClient()
    const supabase = getSupabaseEcommerce()
    if (!authClient || !supabase) {
      console.warn('[Auth] Supabase no configurado')
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    console.log('[Auth] Obteniendo perfil para usuario:', userId)
    const startTime = Date.now()
    let lastError: any = null
    const maxRetries = 1
    const timeoutMs = 10000

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Auth] Reintento ${attempt} de obtener perfil...`)
          await new Promise(resolve => setTimeout(resolve, 500 * attempt))
        }

        const queryPromise = supabase
          .from(ECOMMERCE_TABLES.userProfiles)
          .select('*')
          .eq('id', userId)
          .single()

        const result = await withTimeout(
          queryPromise,
          timeoutMs,
          `getUserProfile (intento ${attempt + 1})`
        ) as { data: any; error: any }

        const { data, error } = result
        const elapsedTime = Date.now() - startTime
        console.log(`[Auth] Consulta de perfil completada en ${elapsedTime}ms`)

        if (error) {
          const errMsg = typeof error?.message === 'string' ? error.message : (error && typeof error === 'object' ? JSON.stringify(error) : String(error))
          const errCode = error?.code
          let rawString: string
          try {
            rawString = JSON.stringify(error, (_, value) => (typeof value === 'object' && value !== null ? value : value), 2)
          } catch {
            rawString = String(error)
          }
          const msg = `[Auth] Error en consulta de perfil: message=${errMsg || '(sin mensaje)'} code=${errCode ?? '(sin código)'} rawString=${rawString?.slice(0, 300) ?? '(nulo)'}`
          console.error(msg)
          console.error('[Auth] Error objeto:', error)

          if (errCode === 'PGRST116' || (errMsg && (errMsg.includes('No rows') || errMsg.includes('not found')))) {
            console.log('[Auth] Perfil no encontrado, intentando crear perfil automáticamente...')
            const { data: { user: authUser } } = await authClient.auth.getUser()

            if (authUser && authUser.id === userId) {
              const { data: newProfile, error: insertError } = await supabase
                .from(ECOMMERCE_TABLES.userProfiles)
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
          if (errCode === '42501' || (errMsg && (errMsg.includes('permission') || errMsg.includes('RLS')))) {
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
        // Usar console.warn en lugar de console.error para timeouts, ya que es un error esperado y manejado
        console.warn(`[Auth] Timeout después de ${elapsedTime}ms en intento ${attempt + 1}:`, timeoutError.message)
        lastError = timeoutError
        
        // Si es el último intento, retornar error
        if (attempt >= maxRetries) {
          break
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    // Usar console.warn para timeouts, ya que la aplicación puede continuar funcionando
    if (lastError?.message?.includes('timeout') || lastError?.message?.includes('Timeout')) {
      console.warn('[Auth] Timeout al obtener perfil después de todos los intentos. La aplicación continuará funcionando sin el perfil completo.')
    } else {
      console.error('[Auth] Todos los intentos de obtener perfil fallaron. Último error:', lastError?.message)
    }
    
    // Proporcionar un mensaje más útil
    let errorMessage = 'Error al obtener perfil: timeout o error de conexión'
    if (lastError?.message) {
      if (lastError.message.includes('timeout') || lastError.message.includes('Timeout')) {
        errorMessage = 'Timeout al conectar con Supabase. La aplicación continuará funcionando, pero algunas funciones pueden estar limitadas.'
      } else {
        errorMessage = lastError.message
      }
    }
    
    // Retornar error pero permitir que la aplicación continúe
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
    const supabase = getSupabaseEcommerce()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }
    const result = await withTimeout(
      supabase
        .from(ECOMMERCE_TABLES.userProfiles)
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
 * Reenviar email de confirmación.
 *
 * D25: pasa por el mismo prepareAuthRedirect que signUp -- reusa el límite
 * de envíos (60s/5 por hora) en vez de confiar solo en el propio de GoTrue,
 * y mintea un intent nuevo (D24: cada link vive una hora) para que el link
 * reenviado siga resolviendo la tienda correcta en el hook.
 */
export async function resendConfirmationEmail(
  email: string,
  turnstileToken: string | null = null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    const prepared = await prepareAuthRedirect({ email, purpose: 'signup', path: '/auth/callback', turnstileToken })
    if (!prepared.ok) {
      return { success: false, error: PREPARE_AUTH_REDIRECT_ERROR }
    }

    const result = await withTimeout(
      supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: prepared.redirectTo,
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
 * Enviar email de recuperación de contraseña.
 *
 * D26's Turnstile gate and D25's reused rate limit both live in
 * prepareAuthRedirect, called here before GoTrue -- resetPasswordForEmail
 * itself already never reveals whether `email` belongs to an account (D24),
 * so this wrapper only ever adds a generic, equally uninformative failure on
 * top, never a distinguishing one.
 */
export async function resetPassword(
  email: string,
  turnstileToken: string | null = null,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      return {
        success: false,
        error: 'Supabase no configurado',
      }
    }

    const prepared = await prepareAuthRedirect({ email, purpose: 'recovery', path: '/auth/reset-password', turnstileToken })
    if (!prepared.ok) {
      return { success: false, error: PREPARE_RECOVERY_REDIRECT_ERROR }
    }

    // `redirectTo` es el nombre real de la opción: resetPasswordForEmail ignora
    // `emailRedirectTo` (eso es de signUp/resend). prepared.redirectTo ya es la
    // URL del subdominio persistido (D8), minteada por prepareAuthRedirect --
    // nunca window.location ni un header sin verificar.
    const result = await withTimeout(
      supabase.auth.resetPasswordForEmail(email, {
        redirectTo: prepared.redirectTo,
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
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string; code?: 'same_password' }> {
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
      30000,
      'updatePassword'
    ) as { error: any }
    const { error } = result

    if (error) {
      console.error('[Auth] Error al actualizar contraseña:', error)
      return {
        success: false,
        error: error.message || 'Error al actualizar contraseña',
        code: isSamePasswordError(error) ? 'same_password' : undefined,
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

export type PasswordChangeResult =
  | { success: true }
  | { success: false; reason: 'wrongCurrentPassword' }
  | { success: false; reason: 'samePassword' }
  | { success: false; reason: 'failed'; error: string }

const REAUTHENTICATION_TIMEOUT_MS = 15000

/**
 * Cambiar la contraseña propia desde una sesión viva, exigiendo la actual (D21).
 *
 * A diferencia de updatePassword, que se llama tras probar identidad por link de
 * correo o por contraseña temporal recién tecleada, esta ruta se abre desde
 * cualquier sesión persistente: sin la contraseña actual, un portátil prestado
 * bastaría para dejar fuera al dueño de la cuenta.
 */
export async function changeOwnPassword({
  currentPassword,
  newPassword,
}: {
  currentPassword: string
  newPassword: string
}): Promise<PasswordChangeResult> {
  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { success: false, reason: 'failed', error: 'Supabase no configurado' }
  }

  try {
    // El correo lo pone la sesión, nunca el formulario: con un correo ajeno esto
    // dejaría de probar identidad y pasaría a ser un cambio de cuenta, con el
    // updateUser de abajo cayendo sobre la equivocada.
    const session = await withTimeout<UserResponse>(
      supabase.auth.getUser(),
      10000,
      'changeOwnPassword/getUser'
    )
    const email = session.data.user?.email
    if (!email) {
      return {
        success: false,
        reason: 'failed',
        error: session.error?.message || 'No hay sesión activa',
      }
    }

    // Supabase no expone un "verifica esta contraseña": volver a iniciar sesión
    // con ella es la única prueba. Fallar no toca la sesión guardada (auth-js
    // solo escribe storage cuando la respuesta trae sesión), así que un intento
    // equivocado deja dentro a quien ya estaba; acertar la renueva con tokens
    // frescos y el mismo usuario.
    const reauthentication = await withTimeout<AuthTokenResponsePassword>(
      supabase.auth.signInWithPassword({ email, password: currentPassword }),
      REAUTHENTICATION_TIMEOUT_MS,
      'changeOwnPassword/reauthentication'
    )
    if (reauthentication.error) {
      if (isInvalidCredentialsError(reauthentication.error)) {
        return { success: false, reason: 'wrongCurrentPassword' }
      }
      return { success: false, reason: 'failed', error: reauthentication.error.message }
    }

    const updated = await updatePassword(newPassword)
    if (updated.success) {
      return { success: true }
    }
    if (updated.code === 'same_password') {
      return { success: false, reason: 'samePassword' }
    }
    return {
      success: false,
      reason: 'failed',
      error: updated.error || 'Error al actualizar contraseña',
    }
  } catch (error) {
    console.error('[Auth] Error inesperado al cambiar la contraseña propia:', error)
    return {
      success: false,
      reason: 'failed',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

// Una contraseña que no coincide llega como 400 con code 'invalid_credentials'.
// Cualquier otro fallo —red, rate limit, GoTrue caído— no prueba nada sobre la
// contraseña y no puede presentarse como "esa no es la tuya".
function isInvalidCredentialsError(error: AuthError): boolean {
  return error.code === 'invalid_credentials' || (!error.code && error.status === 400)
}

// Supabase rejects updateUser when the new password matches the current one. Recent
// supabase-js versions surface this as error.code === 'same_password'; older ones only
// set the message, so we fall back to matching it (kept non-locale-specific: Supabase's
// error messages are English regardless of the app locale).
function isSamePasswordError(error: any): boolean {
  if (error?.code === 'same_password') {
    return true
  }
  const message: string = error?.message || ''
  return message.includes('different from the old') || message.includes('should be different')
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
      // Si el evento es SIGNED_OUT, siempre establecer usuario como null
      if (event === 'SIGNED_OUT' || !session?.user) {
        callback(null)
        return
      }

      // Si hay una sesión activa, intentar obtener el perfil
      if (session?.user) {
        // Usar un timeout adicional para evitar que el callback se bloquee indefinidamente
        const profilePromise = getUserProfile(session.user.id)
        const timeoutPromise = new Promise<AuthResult>((resolve) => {
          setTimeout(() => {
            resolve({
              success: false,
              error: 'Timeout en onAuthStateChange',
            })
          }, 12000) // 12 segundos máximo para el callback completo
        })
        
        const profileResult = await Promise.race([profilePromise, timeoutPromise])
        
        // Si se obtuvo el perfil exitosamente, llamar callback con el usuario
        if (profileResult.success && profileResult.user) {
          callback(profileResult.user)
        } else {
          // En caso de error o timeout, verificar si la sesión sigue activa
          const isTimeout = profileResult.error?.includes('Timeout') || profileResult.error?.includes('timeout')
          
          if (isTimeout && session?.user) {
            // Si es timeout pero hay sesión activa, NO llamar callback
            // Esto evita que se "cierre" la sesión visualmente cuando hay un timeout
            // La sesión de Supabase sigue activa, solo no se pudo obtener el perfil
            // El contexto de autenticación mantendrá el usuario actual
            console.warn("[Auth] Timeout al obtener perfil en onAuthStateChange, pero sesión sigue activa. Manteniendo estado actual del usuario.")
            // No llamar callback - esto mantiene el estado actual del usuario en el contexto
            return
          }
          
          // Si no es timeout, verificar si realmente no hay sesión antes de llamar callback(null)
          // Esto evita cerrar la sesión visualmente por errores temporales
          try {
            const { data: { session: currentSession } } = await supabase.auth.getSession()
            if (!currentSession) {
              // Solo llamar callback(null) si realmente no hay sesión
              console.warn("[Auth] No hay sesión activa, cerrando sesión")
              callback(null)
            } else {
              // Si hay sesión pero no se pudo obtener el perfil (error no timeout), mantener estado actual
              console.warn("[Auth] Error al obtener perfil pero sesión sigue activa. Manteniendo estado actual:", profileResult.error)
              // No llamar callback para mantener el estado actual
            }
          } catch (sessionError) {
            // Si no se puede verificar la sesión, no cambiar el estado
            console.warn("[Auth] No se pudo verificar sesión, manteniendo estado actual:", sessionError)
          }
        }
      }
    } catch (error) {
      console.warn("[Auth] Error en onAuthStateChange (no crítico):", error)
      // Solo establecer como null si realmente no hay sesión
      // Verificar la sesión actual antes de establecer null
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (!currentSession) {
          callback(null)
        }
        // Si hay sesión, no hacer nada para mantener el estado actual
      } catch (sessionError) {
        // Si no se puede verificar la sesión, no cambiar el estado
        console.warn("[Auth] No se pudo verificar sesión actual:", sessionError)
      }
    } finally {
      // Permitir procesar el siguiente evento después de un breve delay
      setTimeout(() => {
        isProcessing = false
      }, 100)
    }
  })
}
