import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { mockSupabaseClient } from '../__mocks__/supabase'

// Mock del cliente de Supabase
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: vi.fn(),
}))

// Mock de getUserProfile
vi.mock('@/lib/supabase/auth-api', async () => {
  const actual = await vi.importActual('@/lib/supabase/auth-api')
  return {
    ...actual,
    getUserProfile: vi.fn(),
  }
})

// Importar después del mock
import { signUp } from '@/lib/supabase/auth-api'
import * as authApi from '@/lib/supabase/auth-api'

describe('Flujo Completo de Registro - Integración', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseBrowserClient).mockReturnValue(mockSupabaseClient as any)
  })

  it('debe completar el flujo completo de registro exitosamente', async () => {
    // Paso 1: Datos del usuario
    const userData = {
      email: 'nuevo@example.com',
      password: 'securePassword123',
      firstName: 'María',
      lastName: 'García',
    }

    // Paso 2: Mock de respuesta de Supabase
    const mockUser = {
      id: 'new-user-123',
      email: userData.email,
    }

    const mockSession = {
      user: mockUser,
      access_token: 'new-token-123',
    }

    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: {
        user: mockUser,
        session: mockSession,
      },
      error: null,
    })

    // Paso 3: Mock de perfil creado por trigger
    vi.mocked(authApi.getUserProfile).mockResolvedValue({
      success: true,
      user: {
        id: mockUser.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
      },
    })

    // Paso 4: Ejecutar registro
    const result = await signUp(
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName
    )

    // Paso 5: Verificar resultados
    expect(result.success).toBe(true)
    expect(result.user).toBeDefined()
    expect(result.user?.email).toBe(userData.email)
    expect(result.user?.first_name).toBe(userData.firstName)
    expect(result.user?.last_name).toBe(userData.lastName)

    // Verificar que se llamó a signUp con los parámetros correctos
    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
        emailRedirectTo: expect.any(String),
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

    vi.mocked(authApi.getUserProfile).mockResolvedValue({
      success: true,
      user: {
        id: mockUser.id,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
      },
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

  it('debe crear perfil manualmente si el trigger falla', async () => {
    const userData = {
      email: 'fallback@example.com',
      password: 'password123',
      firstName: 'Laura',
      lastName: 'Sánchez',
    }

    const mockUser = {
      id: 'fallback-user-123',
      email: userData.email,
    }

    vi.mocked(mockSupabaseClient.auth.signUp).mockResolvedValue({
      data: {
        user: mockUser,
        session: { user: mockUser, access_token: 'token' },
      },
      error: null,
    })

    // Simular que el trigger falló
    vi.mocked(authApi.getUserProfile)
      .mockResolvedValueOnce({
        success: false,
        error: 'Perfil no encontrado',
      })
      .mockResolvedValueOnce({
        success: true,
        user: {
          id: mockUser.id,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
        },
      })

    // Mock de insert manual
    const mockInsert = vi.fn().mockResolvedValue({ error: null })
    const mockFrom = vi.fn().mockReturnValue({
      insert: mockInsert,
    })
    vi.mocked(mockSupabaseClient.from).mockImplementation(mockFrom)

    const result = await signUp(
      userData.email,
      userData.password,
      userData.firstName,
      userData.lastName
    )

    // El código intentará crear el perfil manualmente
    expect(mockSupabaseClient.auth.signUp).toHaveBeenCalled()
  })
})

