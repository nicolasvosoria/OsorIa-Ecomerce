"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { updatePassword } from "@/lib/supabase/auth-api"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import Link from "next/link"

function ResetPasswordContent() {
  const router = useRouter()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(true)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [hasValidSession, setHasValidSession] = useState(false)

  useEffect(() => {
    const verifyTokenAndSession = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        if (!supabase) {
          setStatus("error")
          setErrorMessage("Error de configuración")
          setIsVerifying(false)
          return
        }

        console.log("[ResetPassword] URL completa:", window.location.href)
        console.log("[ResetPassword] Hash:", window.location.hash)

        // Verificar si hay un token de recuperación en el hash de la URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const type = hashParams.get("type")
        const refreshToken = hashParams.get("refresh_token")

        console.log("[ResetPassword] Token encontrado:", {
          type,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        })

        // Listener para detectar cuando se crea la sesión desde el token
        let subscription: { unsubscribe: () => void } | null = null
        
        const setupListener = () => {
          const { data } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
            console.log("[ResetPassword] Evento de autenticación:", event, "Sesión:", !!session)
            
            if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
              if (session) {
                console.log("[ResetPassword] Sesión creada desde token de recuperación")
                setHasValidSession(true)
                setStatus("idle")
                setIsVerifying(false)
                
                // Limpiar el hash de la URL después de procesar
                if (window.location.hash) {
                  window.history.replaceState(null, "", window.location.pathname)
                }
              }
            }
          })
          subscription = data.subscription
        }

        setupListener()

        if (type === "recovery" && (accessToken || refreshToken)) {
          console.log("[ResetPassword] Token de recuperación encontrado, procesando...")
          
          // Si hay tokens en el hash, Supabase debería procesarlos automáticamente
          // pero a veces necesitamos forzar el intercambio
          if (accessToken && refreshToken) {
            try {
              // Intentar intercambiar el token por una sesión
              const { data: { session }, error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })

              if (sessionError) {
                console.error("[ResetPassword] Error al establecer sesión:", sessionError)
              } else if (session) {
                console.log("[ResetPassword] Sesión establecida correctamente")
                setHasValidSession(true)
                setStatus("idle")
                setIsVerifying(false)
                
                // Limpiar el hash de la URL
                if (window.location.hash) {
                  window.history.replaceState(null, "", window.location.pathname)
                }
                return
              }
            } catch (error) {
              console.error("[ResetPassword] Error al procesar tokens:", error)
            }
          }

          // Esperar un momento para que Supabase procese el token del hash automáticamente
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Verificar si hay una sesión activa
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()
          
          if (sessionError) {
            console.error("[ResetPassword] Error al obtener sesión:", sessionError)
          }

          if (session) {
            console.log("[ResetPassword] Sesión válida encontrada")
            setHasValidSession(true)
            setStatus("idle")
            setIsVerifying(false)
            
            // Limpiar el hash de la URL
            if (window.location.hash) {
              window.history.replaceState(null, "", window.location.pathname)
            }
          } else {
            // Esperar un poco más para que el listener procese el token
            setTimeout(async () => {
              const { data: { session: retrySession } } = await supabase.auth.getSession()
              if (retrySession) {
                console.log("[ResetPassword] Sesión encontrada después del retry")
                setHasValidSession(true)
                setStatus("idle")
              } else {
                console.error("[ResetPassword] No se pudo crear sesión después de múltiples intentos")
                setStatus("error")
                setErrorMessage("El link de recuperación es inválido o ha expirado. Por favor, solicita un nuevo link.")
              }
              setIsVerifying(false)
            }, 3000)
          }
        } else {
          // Verificar si ya hay una sesión activa (por si el usuario ya procesó el token)
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session) {
            console.log("[ResetPassword] Sesión activa encontrada")
            setHasValidSession(true)
            setStatus("idle")
            setIsVerifying(false)
          } else {
            console.error("[ResetPassword] No hay token ni sesión válida")
            setStatus("error")
            setErrorMessage("Link de recuperación inválido o expirado. Por favor, solicita un nuevo link.")
            setIsVerifying(false)
          }
        }

        // Cleanup subscription
        return () => {
          if (subscription) {
            subscription.unsubscribe()
          }
        }
      } catch (error: any) {
        console.error("[ResetPassword] Error inesperado:", error)
        setStatus("error")
        setErrorMessage("Error al procesar el link de recuperación")
        setIsVerifying(false)
      }
    }

    verifyTokenAndSession()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!newPassword || !confirmPassword) {
      toast.error("Campos incompletos", {
        description: "Por favor, completa todos los campos",
        duration: 3000,
      })
      return
    }

    if (newPassword.length < 6) {
      toast.error("Contraseña muy corta", {
        description: "La contraseña debe tener al menos 6 caracteres",
        duration: 3000,
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("Las contraseñas no coinciden", {
        description: "Por favor, verifica que ambas contraseñas sean iguales",
        duration: 3000,
      })
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      const result = await updatePassword(newPassword)

      if (result.success) {
        setStatus("success")
        toast.success("Contraseña actualizada", {
          description: "Tu contraseña ha sido restablecida exitosamente",
          duration: 3000,
        })

        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          router.push("/")
        }, 3000)
      } else {
        setStatus("error")
        setErrorMessage(result.error || "Error al actualizar la contraseña")
        toast.error("Error al actualizar contraseña", {
          description: result.error || "Por favor, intenta nuevamente",
          duration: 5000,
        })
      }
    } catch (error: any) {
      setStatus("error")
      setErrorMessage(error.message || "Error inesperado")
      toast.error("Error inesperado", {
        description: "Ocurrió un error al procesar tu solicitud",
        duration: 5000,
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--background)" }}>
        <div className="w-full max-w-md">
          <div className="text-center space-y-6 p-8 rounded-lg border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "var(--primary)", opacity: 0.1 }}>
                <CheckCircle2 className="w-8 h-8" style={{ color: "var(--primary)" }} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                ¡Contraseña Restablecida!
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Tu contraseña ha sido actualizada exitosamente. Serás redirigido al inicio en unos segundos...
              </p>
            </div>
            <div className="pt-4">
              <Link href="/">
                <Button
                  className="w-full"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  Ir al inicio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--background)" }}>
        <div className="w-full max-w-md">
          <div className="text-center space-y-6 p-8 rounded-lg border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--primary)" }} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                Verificando link...
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Por favor espera mientras verificamos tu link de recuperación
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (status === "error" && !hasValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--background)" }}>
        <div className="w-full max-w-md">
          <div className="text-center space-y-6 p-8 rounded-lg border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: "#ef4444", opacity: 0.1 }}>
                <XCircle className="w-8 h-8" style={{ color: "#ef4444" }} />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                Link Inválido
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                {errorMessage || "El link de recuperación es inválido o ha expirado. Por favor, solicita un nuevo link."}
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <Link href="/">
                <Button
                  className="w-full"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  Volver al inicio
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--background)" }}>
      <div className="w-full max-w-md">
        <div className="p-8 rounded-lg border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>
                Restablecer Contraseña
              </h1>
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Ingresa tu nueva contraseña
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="newPassword"
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pr-10 placeholder:opacity-50"
                    style={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Mínimo 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                  style={{ color: "var(--foreground)" }}
                >
                  Confirmar Nueva Contraseña
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pr-10 placeholder:opacity-50"
                    style={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    title={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#ef4444", opacity: 0.1, color: "#ef4444" }}>
                  {errorMessage}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading}
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Restablecer Contraseña"
                  )}
                </Button>
                <Link href="/">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isLoading}
                    style={{
                      borderColor: "var(--border)",
                      color: "var(--foreground)",
                    }}
                  >
                    Cancelar
                  </Button>
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: "var(--background)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

