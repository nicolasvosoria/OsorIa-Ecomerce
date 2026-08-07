"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { KeyRound, Loader2, LogOut, XCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/contexts/auth-context"
import { blamePasswordFields, findPasswordProblem, MIN_PASSWORD_LENGTH, type PasswordFieldErrors } from "@/lib/account/password-rule"
import { useFocusOnViewChange } from "@/lib/hooks/use-focus-on-view-change"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { updatePassword } from "@/lib/supabase/auth-api"
import { completeInviteSetup } from "./actions"

// D20/D22: where a native owner/new-user invite lands. Exchanges GoTrue's
// invite token for the live session (verifyOtp), then requires a real
// password before anything else -- the ONLY other things D22's global gate
// (proxy.ts) lets an invited session reach are this same page and logout,
// so that escape hatch has to live here too.
export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<StatusCard icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />} title="Verificando invitación" description="Un momento." />}>
      <AcceptInviteFlow />
    </Suspense>
  )
}

type Phase = { step: "verifying" } | { step: "rejected" } | { step: "ready" }

function AcceptInviteFlow() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get("token_hash")
  const [phase, setPhase] = useState<Phase>({ step: "verifying" })
  // El token del correo se gasta al canjearlo: un segundo intento (el doble
  // montaje de StrictMode en desarrollo) convertiría un link válido en rechazado.
  const claimStarted = useRef(false)

  useEffect(() => {
    if (claimStarted.current) return
    claimStarted.current = true

    claimInviteSession(tokenHash).then((claimed) => {
      setPhase({ step: claimed ? "ready" : "rejected" })
      if (claimed) {
        window.history.replaceState(null, "", window.location.pathname)
      }
    })
  }, [tokenHash])

  if (phase.step === "verifying") {
    return <StatusCard icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />} title="Verificando invitación" description="Un momento." />
  }
  if (phase.step === "rejected") {
    return <RejectedCard />
  }
  return <PasswordSetupCard />
}

async function claimInviteSession(tokenHash: string | null): Promise<boolean> {
  if (!tokenHash) {
    return false
  }

  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return false
  }

  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "invite" })
  return !error
}

function RejectedCard() {
  return (
    <StatusCard
      icon={<XCircle className="h-8 w-8 text-destructive" />}
      title="Enlace no válido"
      description="Este enlace de invitación ya expiró, ya se usó o no es válido. Pide a quien te invitó que te envíe uno nuevo."
    />
  )
}

function PasswordSetupCard() {
  const router = useRouter()
  const { logout } = useAuth()
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({})
  const headingRef = useFocusOnViewChange<HTMLHeadingElement>("ready")

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const problem = findPasswordProblem({ newPassword, confirmation: confirmPassword })
    if (problem) {
      const message = {
        incomplete: "Completa ambos campos",
        tooShort: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        mismatch: "Las contraseñas no coinciden",
      }[problem]
      setFieldErrors(blamePasswordFields({ problem, message, typed: { newPassword, confirmation: confirmPassword } }))
      toast.error(message)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    // "same_password" solo puede pasar si un intento anterior ya aplicó en el
    // servidor pero el cliente no llegó a enterarse (timeout): la persona ya
    // está en la contraseña que eligió, así que se trata como éxito en vez de
    // atraparla en un loop (mismo razonamiento que force-password-change).
    const changed = await updatePassword(newPassword)
    if (!changed.success && changed.code !== "same_password") {
      setIsSubmitting(false)
      toast.error(changed.error ?? "No se pudo guardar la contraseña")
      return
    }

    const completed = await completeInviteSetup()
    setIsSubmitting(false)
    if (!completed.success) {
      toast.error(completed.error)
    }
  }

  const handleLogout = async () => {
    setIsSigningOut(true)
    await logout()
    router.push("/")
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" role="status" aria-live="polite">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle asChild className="text-2xl">
            <h1 ref={headingRef} tabIndex={-1} className="outline-none">
              Elige tu contraseña
            </h1>
          </CardTitle>
          <CardDescription>Te invitaron a la plataforma. Elige una contraseña para entrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField id="new-password" label="Contraseña" hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`} error={fieldErrors.newPassword}>
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              )}
            </FormField>
            <FormField id="confirm-password" label="Confirmar contraseña" error={fieldErrors.confirmation}>
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              )}
            </FormField>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Guardar y entrar
            </Button>
            <Button type="button" variant="outline" disabled={isSigningOut} className="w-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  const headingRef = useFocusOnViewChange<HTMLHeadingElement>(title)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md" role="status" aria-live="polite">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">{icon}</div>
          <CardTitle asChild className="text-2xl">
            <h1 ref={headingRef} tabIndex={-1} className="outline-none">
              {title}
            </h1>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
