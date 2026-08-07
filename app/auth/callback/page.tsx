"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { XCircle } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { FORCE_PASSWORD_CHANGE_PATH, getAuthReturnPath, resolvePostAuthDestination } from "@/lib/auth-return-intent"
import { claimEmailLink, readEmailLink, type EmailLinkRejection } from "@/lib/auth/claim-email-link"
import { finalizeCustomerSignup } from "@/lib/auth/finalize-signup-action"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { currentUserMustChangePassword, isCurrentUserAdminOrUnverified } from "@/lib/supabase/permissions-api"

type CallbackPhase = { step: "verifying" } | { step: "rejected"; reason: EmailLinkRejection }

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [phase, setPhase] = useState<CallbackPhase>({ step: "verifying" })
  // El link se gasta al canjearlo: un segundo intento (el doble montaje de
  // StrictMode en desarrollo) convertiría un link válido en rechazado.
  const claimStarted = useRef(false)

  useEffect(() => {
    if (claimStarted.current) return
    claimStarted.current = true

    const pushPostAuthDestination = async () => {
      // Un dueño con clave temporal (D21) va a cambiarla antes que a cualquier
      // destino; el guard de servidor de /admin es la red de seguridad si este
      // adelanto de UX no concluye.
      if (await currentUserMustChangePassword()) {
        router.push(FORCE_PASSWORD_CHANGE_PATH)
        return
      }

      router.push(
        resolvePostAuthDestination({
          returnPath: getAuthReturnPath(searchParams),
          canAccessAdmin: await isCurrentUserAdminOrUnverified(),
        }),
      )
    }

    const resolveExistingSession = async (): Promise<EmailLinkRejection | null> => {
      const supabase = getSupabaseBrowserClient()
      if (!supabase) {
        return { cause: "verificationUnavailable" }
      }

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()
      if (error) {
        return { cause: "verificationUnavailable" }
      }
      if (!session) {
        return { cause: "noTokenInLink" }
      }

      // Ya hay sesión (p. ej. llegó sin link que canjear): redirigir a éxito o
      // inicio salvo que exista un destino admin seguro permitido.
      await pushPostAuthDestination()
      return null
    }

    const resolveCallback = async (): Promise<EmailLinkRejection | null> => {
      const gotrueError = readGotrueError(searchParams)
      if (gotrueError) {
        return gotrueError
      }

      const link = readEmailLink({
        tokenHash: searchParams.get("token_hash"),
        linkType: searchParams.get("type"),
        code: searchParams.get("code"),
      })

      if (link.kind === "absent") {
        return resolveExistingSession()
      }

      const claim = await claimEmailLink(link)
      if (claim.outcome === "rejected") {
        return claim.reason
      }

      // D23: finaliza el perfil del cliente de forma idempotente contra la
      // tienda que quedó ligada al intent server-side (nunca contra este
      // host) -- un no-op seguro si `intent` falta. El resultado se descarta
      // a propósito: la sesión ya quedó establecida, así que no hay nada que
      // este usuario pueda corregir si falla (un intent ya consumido o
      // expirado, un permiso de base de datos). finalizeCustomerSignup ya
      // deja un log estructurado del lado del servidor ante cualquier fallo
      // (D36) -- interrumpir aquí el login que sí funcionó no ayuda a nadie.
      await finalizeCustomerSignup(searchParams.get("intent"))
      await pushPostAuthDestination()
      return null
    }

    resolveCallback()
      .catch((error) => {
        console.error("[Auth] Error inesperado en callback:", error)
        return { cause: "verificationUnavailable" as const }
      })
      .then((rejection) => {
        if (rejection) {
          setPhase({ step: "rejected", reason: rejection })
        }
      })
  }, [router, searchParams])

  if (phase.step === "rejected") {
    return <LinkRejectedScreen reason={phase.reason} />
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p style={{ color: "var(--foreground)" }}>Procesando autenticación...</p>
      </div>
    </div>
  )
}

// GoTrue puede rechazar el link antes de que esta página tenga token_hash o
// code que canjear (p. ej. la plantilla hospedada de un ?code ya vencido):
// mismo tratamiento visible que un canje rechazado, nunca un redirect
// silencioso.
function readGotrueError(searchParams: Pick<URLSearchParams, "get">): EmailLinkRejection | null {
  const error = searchParams.get("error")
  if (!error) {
    return null
  }

  return { cause: "refusedByAuth", detail: searchParams.get("error_description") ?? error }
}

function LinkRejectedScreen({ reason }: { reason: EmailLinkRejection }) {
  const explanation = {
    noTokenInLink: "Este enlace no trae los datos de confirmación. Vuelve a registrarte para recibir uno nuevo.",
    verificationUnavailable: "No pudimos verificar el enlace en este momento. Vuelve a intentarlo en un minuto.",
    refusedByAuth: "Este enlace de confirmación ya se usó o expiró. Vuelve a registrarte para recibir uno nuevo.",
  }[reason.cause]

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">Enlace no válido</h1>
          <CardDescription>{explanation}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reason.cause === "refusedByAuth" && (
            <Alert variant="destructive">
              <AlertDescription>{reason.detail}</AlertDescription>
            </Alert>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">Volver a iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
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
