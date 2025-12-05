"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      
      // Intercambiar el código de confirmación por una sesión
      const { data, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error("[Auth] Error al procesar callback:", error)
        router.push("/?error=auth_callback_failed")
        return
      }

      if (data.session) {
        // Sesión creada exitosamente, redirigir al home
        router.push("/")
      } else {
        // No hay sesión, redirigir al login
        router.push("/?error=no_session")
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p style={{ color: "var(--foreground)" }}>Procesando autenticación...</p>
      </div>
    </div>
  )
}

