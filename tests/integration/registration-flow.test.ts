import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseBrowserClient, getSupabaseEcommerce } from '@/lib/supabase/client'
import { prepareAuthRedirect } from '@/lib/auth/prepare-auth-redirect'
import { mockSupabaseClient } from '../__mocks__/supabase'

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
  getSupabaseEcommerce: vi.fn(),
}))

// D23: la única pieza server-side que signUp() llama; su comportamiento real
// se prueba en tests/security/prepare-auth-redirect.test.ts.
vi.mock('@/lib/auth/prepare-auth-redirect', () => ({
  prepareAuthRedirect: vi.fn(),
}))

import { signUp } from '@/lib/supabase/auth-api'

describe('Flujo Completo de Registro - Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(getSupabaseEcommerce).mockReturnValue(mockSupabaseClient as any)
    vi.mocked(prepareAuthRedirect).mockResolvedValue({
      ok: true,
      redirectTo: 'https://tienda.osoria.help/auth/callback?intent=preview-token',
    })
  })

  it('debe completar el flujo completo de registro exitosamente', async () => {
    const userData = {
      email: 'nuevo@example.com',
      password: 'securePassword123',
      firstName: 'María',
      lastName: 'García',
    }

    const mockUser = {
      id: 'new-user-123',
      email: userData.email,
    }

    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: {
        user: mockUser,
        session: { user: mockUser, access_token: 'new-token-123' },
      },
      error: null,
    })

    const result = await signUp(
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName
    )

    expect(result.success).toBe(true)

    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
        emailRedirectTo: 'https://tienda.osoria.help/auth/callback?intent=preview-token',
      },
    })
  })

  it('debe manejar el caso cuando se requiere confirmación de email', async () => {
    const userData = {
      email: 'confirmar@example.com',
      password: 'password123',
      firstName: 'Pedro',
      lastName: 'López',
    }

    const mockUser = {
      id: 'pending-user-123',
      email: userData.email,
    }

    // Sin sesión = email de confirmación enviado
    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: {
        user: mockUser,
        session: null,
      },
      error: null,
    })

    const result = await signUp(
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName
    )

    expect(result.success).toBe(true)
    expect(result.emailSent).toBe(true)
  })

  it('debe manejar errores de validación de email duplicado', async () => {
    const userData = {
      email: 'duplicado@example.com',
      password: 'password123',
      firstName: 'Ana',
      lastName: 'Martínez',
    }

    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: null,
      error: {
        message: 'User already registered',
        status: 400,
      },
    })

    const result = await signUp(
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName
    )

    expect(result.success).toBe(false)
    expect(result.error).toBe('User already registered')
  })

  it('debe manejar errores de contraseña débil', async () => {
    const userData = {
      email: 'test@example.com',
      password: '123', // Contraseña muy corta
      firstName: 'Carlos',
      lastName: 'Ruiz',
    }

    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: null,
      error: {
        message: 'Password should be at least 6 characters',
        status: 400,
      },
    })

    const result = await signUp(
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Password')
  })

  // D23/D26: un registro que no pasa el gate de prepareAuthRedirect (Turnstile,
  // límite de envíos, tienda no resuelta) nunca llega a llamar a Supabase.
  it('debe detener el registro sin llamar a Supabase cuando el gate previo lo rechaza', async () => {
    vi.mocked(prepareAuthRedirect).mockResolvedValue({ ok: false, reason: 'rate_limited' })

    const result = await signUp('bloqueado@example.com', 'password123', 'Luis', 'Pérez')

    expect(result.success).toBe(false)
    expect(mockSupabaseClient.auth.signUp).not.toHaveBeenCalled()
  })
})
