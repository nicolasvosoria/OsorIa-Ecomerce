import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/contexts/auth-context'
import { signUp, signIn, getCurrentUser, onAuthStateChange } from '@/lib/supabase/auth-api'

// Mock de las funciones de auth-api
vi.mock('@/lib/supabase/auth-api', () => ({
  signUp: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}))

// Componente de prueba que usa el contexto
function TestComponent() {
  const { user, isAuthenticated, isLoading, register, login, logout } = useAuth()

  return (
    <div>
      {isLoading ? (
        <div data-testid="loading">Cargando...</div>
      ) : (
        <>
          <div data-testid="authenticated">{isAuthenticated ? 'Autenticado' : 'No autenticado'}</div>
          <div data-testid="user-email">{user?.email || 'Sin usuario'}</div>
          <button
            data-testid="register-btn"
            onClick={() => register('test@example.com', 'password123', 'Juan', 'Pérez')}
          >
            Registrar
          </button>
          <button
            data-testid="login-btn"
            onClick={() => login('test@example.com', 'password123')}
          >
            Iniciar Sesión
          </button>
          <button data-testid="logout-btn" onClick={() => logout()}>
            Cerrar Sesión
          </button>
        </>
      )}
    </div>
  )
}

describe('AuthContext - Contexto de autenticación', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debe proporcionar el contexto correctamente', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      success: false,
      error: 'No hay usuario autenticado',
    })

    vi.mocked(onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('No autenticado')
  })

  it('debe llamar a signUp cuando se usa register', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'Juan',
      last_name: 'Pérez',
    }

    vi.mocked(getCurrentUser).mockResolvedValue({
      success: false,
      error: 'No hay usuario autenticado',
    })

    vi.mocked(signUp).mockResolvedValue({
      success: true,
      user: mockUser,
    })

    vi.mocked(onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    const registerBtn = screen.getByTestId('register-btn')
    registerBtn.click()

    await waitFor(() => {
      expect(signUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        'Juan',
        'Pérez'
      )
    })
  })

  it('debe llamar a signIn cuando se usa login', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      success: false,
      error: 'No hay usuario autenticado',
    })

    vi.mocked(signIn).mockResolvedValue({
      success: true,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        first_name: null,
        last_name: null,
      },
    })

    vi.mocked(onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    const loginBtn = screen.getByTestId('login-btn')
    loginBtn.click()

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('debe mostrar el usuario cuando está autenticado', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'authenticated@example.com',
      first_name: 'Juan',
      last_name: 'Pérez',
    }

    vi.mocked(getCurrentUser).mockResolvedValue({
      success: true,
      user: mockUser,
    })

    vi.mocked(onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    } as any)

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('authenticated')).toHaveTextContent('Autenticado')
    expect(screen.getByTestId('user-email')).toHaveTextContent('authenticated@example.com')
  })
})

