"use client"

import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react"
import type { UserProfile, AuthResult } from "@/lib/types/user"
import {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChange,
} from "@/lib/supabase/auth-api"

interface AuthContextType {
  user: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<AuthResult>
  register: (email: string, password: string, firstName?: string, lastName?: string) => Promise<AuthResult>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadUser = useCallback(async () => {
    try {
      const result = await getCurrentUser()
      if (result.success && result.user) {
        setUser(result.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("[Auth] Error al cargar usuario:", error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar usuario al montar y configurar listener
  useEffect(() => {
    let mounted = true
    let subscription: { unsubscribe: () => void } | null = null

    const initializeAuth = async () => {
      // Cargar usuario inicial
      await loadUser()
      
      // Configurar listener de cambios de autenticación
      // Solo después de que el usuario inicial se haya cargado
      if (mounted) {
        try {
          const { data: { subscription: authSubscription } } = onAuthStateChange((updatedUser) => {
            if (mounted) {
              // Solo actualizar el usuario si se proporciona un valor explícito
              // Si updatedUser es null, solo actualizar si realmente no hay sesión
              if (updatedUser !== null) {
                setUser(updatedUser)
                setIsLoading(false)
              } else {
                // Si updatedUser es null, verificar si realmente no hay sesión antes de actualizar
                // Esto evita que se "cierre" la sesión visualmente por timeouts
                const checkSession = async () => {
                  try {
                    const supabase = (await import("@/lib/supabase/client")).getSupabaseBrowserClient()
                    if (supabase) {
                      const { data: { session } } = await supabase.auth.getSession()
                      if (!session) {
                        // Solo establecer null si realmente no hay sesión
                        setUser(null)
                      }
                      // Si hay sesión pero updatedUser es null (por timeout), mantener el usuario actual
                    }
                  } catch (error) {
                    console.warn("[Auth] Error al verificar sesión en callback:", error)
                    // En caso de error, mantener el estado actual
                  } finally {
                    setIsLoading(false)
                  }
                }
                checkSession()
              }
            }
          })
          subscription = authSubscription
        } catch (error) {
          console.error("[Auth] Error al configurar listener de autenticación:", error)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [loadUser])

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    const result = await signIn(email, password)
    // No actualizar el estado aquí, el listener de onAuthStateChange lo hará
    return result
  }, [])

  const register = useCallback(async (
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<AuthResult> => {
    const result = await signUp(email, password, firstName, lastName)
    // No actualizar el estado aquí, el listener de onAuthStateChange lo hará
    return result
  }, [])

  const logout = useCallback(async () => {
    const result = await signOut()
    if (result.success) {
      setUser(null)
    }
  }, [])

  const refreshUser = useCallback(async () => {
    await loadUser()
  }, [loadUser])

  const value = useMemo<AuthContextType>(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  }), [user, isLoading, login, register, logout, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider")
  }
  return context
}

