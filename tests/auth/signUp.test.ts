import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseBrowserClient, getSupabaseEcommerce } from '@/lib/supabase/client'
import { prepareAuthRedirect } from '@/lib/auth/prepare-auth-redirect'
import { mockSupabaseClient } from '../__mocks__/supabase'

// Mock del cliente de Supabase
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
  getSupabaseEcommerce: vi.fn(),
}))

// D23: signUp() no crea el perfil -- prepareAuthRedirect (Turnstile, límite
// de envíos, mint del auth intent) es la única pieza server-side que llama,
// y aquí se mockea entera: la prueba de su comportamiento real vive en
// tests/security/prepare-auth-redirect.test.ts.
vi.mock('@/lib/auth/prepare-auth-redirect', () => ({
  prepareAuthRedirect: vi.fn(),
}))

// Importar después del mock
import { signUp } from '@/lib/supabase/auth-api'

describe('signUp - Creación de cuentas nuevas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(getSupabaseEcommerce).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(prepareAuthRedirect).mockResolvedValue({
      ok: true,
      redirectTo: 'https://tienda.osoria.help/auth/callback?intent=preview-token',
    })
  })

  it('debe registrar un usuario exitosamente con todos los datos', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: { user: mockUser, session: { user: mockUser, access_token: 'token-123' } },
      error: null,
    })

    const result = await signUp(
      'test@example.com',
      'password123',
      'Juan',
      'Pérez'
    )

    expect(result.success).toBe(true)
    // D23: la creación del perfil se movió al callback (lib/auth/finalize-
    // signup-action.ts) -- signUp ya no devuelve un `user`.
    expect(result.user).toBeUndefined()
    expect(prepareAuthRedirect).toHaveBeenCalledWith({
      email: 'test@example.com',
      purpose: 'signup',
      path: '/auth/callback',
      turnstileToken: null,
    })
    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          first_name: 'Juan',
          last_name: 'Pérez',
        },
        emailRedirectTo: 'https://tienda.osoria.help/auth/callback?intent=preview-token',
      },
    })
  })

  it('debe pasar el turnstileToken recibido a prepareAuthRedirect', async () => {
    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: { user: { id: 'user-456', email: 'test2@example.com' }, session: null },
      error: null,
    })

    await signUp('test2@example.com', 'password123', undefined, undefined, 'a-real-turnstile-token')

    expect(prepareAuthRedirect).toHaveBeenCalledWith(
      expect.objectContaining({ turnstileToken: 'a-real-turnstile-token' }),
    )
  })

  it('debe rechazar el registro sin llamar a Supabase cuando prepareAuthRedirect lo niega', async () => {
    vi.mocked(prepareAuthRedirect).mockResolvedValue({ ok: false, reason: 'turnstile_failed' })

    const result = await signUp('test@example.com', 'password123')

    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
  })

  it('debe manejar errores de Supabase', async () => {
    const errorMessage = 'Email already registered'
    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: null,
      error: {
        message: errorMessage,
        status: 400,
      },
    })

    const result = await signUp('existing@example.com', 'password123')

    expect(result.success).toBe(false)
    expect(result.error).toBe(errorMessage)
  })

  it('debe retornar emailSent cuando no hay sesión (confirmación requerida)', async () => {
    const mockUser = {
      id: 'user-999',
      email: 'test4@example.com',
    }

    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: {
        user: mockUser,
        session: null, // Sin sesión = email de confirmación enviado
      },
      error: null,
    })

    const result = await signUp('test4@example.com', 'password123')

    expect(result.success).toBe(true)
    expect(result.emailSent).toBe(true)
  })

  it('debe manejar cuando Supabase no está configurado', async () => {
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(null)
    vi.mocked(getSupabaseEcommerce).mockReturnValue(null)

    const result = await signUp('test@example.com', 'password123')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Supabase no configurado')
    expect(prepareAuthRedirect).not.toHaveBeenCalled()
  })
})
