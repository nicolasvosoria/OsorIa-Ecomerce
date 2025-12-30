"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        console.error("[Auth] Supabase no configurado")
        router.push("/?error=auth_callback_failed")
        return
      }

      try {
        // Obtener el código de confirmación de la URL
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          console.error("[Auth] Error en callback:", error, errorDescription)
          router.push("/?error=auth_callback_failed")
          return
        }

        if (code) {
          // Intercambiar el código por una sesión
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error("[Auth] Error al intercambiar código:", exchangeError)
            router.push("/?error=auth_callback_failed")
            return
          }

          if (data.session) {
            // Sesión creada exitosamente, redirigir a la página principal
            // Agregar parámetro para indicar que viene de autenticación
            router.push("/?from=auth")
            return
          }
        }

        // Si no hay código, verificar si ya hay una sesión activa
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error("[Auth] Error al obtener sesión:", sessionError)
          router.push("/?error=auth_callback_failed")
          return
        }

        if (session) {
          // Ya hay sesión, redirigir a la página principal
          router.push("/")
        } else {
          // No hay sesión, redirigir al login
          router.push("/?error=no_session")
        }
      } catch (error) {
        console.error("[Auth] Error inesperado en callback:", error)
        router.push("/?error=auth_callback_failed")
      }
    }

    handleAuthCallback()
  }, [router, searchParams])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p style={{ color: "var(--foreground)" }}>Procesando autenticación...</p>
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p style={{ color: "var(--foreground)" }}>Cargando...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

