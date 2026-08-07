"use client"

import { Suspense, useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, XCircle } from "lucide-react"
import { toast } from "sonner"

import { PasswordRecoveryDialog } from "@/components/auth/password-recovery-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/language-context"
import {
  blamePasswordFields,
  findPasswordProblem,
  MIN_PASSWORD_LENGTH,
  type PasswordFieldErrors,
} from "@/lib/account/password-rule"
import { getAuthReturnPath, resolvePostAuthDestination } from "@/lib/auth-return-intent"
import { claimEmailLink, readEmailLink, type EmailLinkRejection } from "@/lib/auth/claim-email-link"
import { updatePassword } from "@/lib/supabase/auth-api"
import { isCurrentUserAdminOrUnverified } from "@/lib/supabase/permissions-api"

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<VerifyingLinkScreen />}>
      <ResetPasswordFlow />
    </Suspense>
  )
}

type RecoveryPhase =
  | { step: "verifying" }
  | { step: "linkRejected"; reason: EmailLinkRejection }
  | { step: "newPassword"; exit: RecoveryExit }
  | { step: "updated"; exit: RecoveryExit }

function ResetPasswordFlow() {
  const searchParams = useSearchParams()
  const tokenHash = searchParams.get("token_hash")
  const linkType = searchParams.get("type")
  const code = searchParams.get("code")
  const returnPath = getAuthReturnPath(searchParams)
  const [phase, setPhase] = useState<RecoveryPhase>({ step: "verifying" })
  // El token del correo se gasta al canjearlo: un segundo intento (el doble
  // montaje de StrictMode en desarrollo) convertiría un link válido en rechazado.
  const claimStarted = useRef(false)

  useEffect(() => {
    if (claimStarted.current) return
    claimStarted.current = true

    // El tipo se exige y se restringe a "recovery": esta pantalla solo completa
    // una recuperación, y un token de alta o de cambio de correo no tiene nada
    // que hacer aquí (a diferencia de app/auth/callback, que acepta cualquiera).
    const link = readEmailLink({ tokenHash, linkType, code, acceptType: (type) => type === "recovery" })

    claimEmailLink(link).then(async (claim) => {
      if (claim.outcome === "rejected") {
        setPhase({ step: "linkRejected", reason: claim.reason })
        return
      }

      setPhase({ step: "newPassword", exit: await resolveRecoveryExit(returnPath) })
      // El token ya está canjeado: dejarlo en la barra de direcciones solo lo
      // expone al historial y al referer sin servir para nada.
      window.history.replaceState(null, "", window.location.pathname)
    })
  }, [tokenHash, linkType, code, returnPath])

  if (phase.step === "verifying") {
    return <VerifyingLinkScreen />
  }

  if (phase.step === "linkRejected") {
    return <LinkRejectedScreen reason={phase.reason} />
  }

  if (phase.step === "updated") {
    return <PasswordUpdatedScreen exit={phase.exit} />
  }

  return (
    <NewPasswordScreen
      exit={phase.exit}
      onUpdated={() => setPhase({ step: "updated", exit: phase.exit })}
    />
  )
}

// Adónde puede salir quien ya canjeó el link. La sesión existe desde ese
// momento, así que el destino se decide por capacidad igual que en el login
// (D4): "/" es un callejón para el dueño, porque el proxy reescribe la raíz de
// una tienda sin publicar al mismo aviso del que venía huyendo.
type RecoveryExit = { path: string; leadsToConsole: boolean }

async function resolveRecoveryExit(returnPath: string | null): Promise<RecoveryExit> {
  const canAccessAdmin = await isCurrentUserAdminOrUnverified()

  return {
    path: resolvePostAuthDestination({
      returnPath,
      canAccessAdmin,
      fallback: canAccessAdmin ? "/admin" : "/",
    }),
    // Todo destino que `resolvePostAuthDestination` entrega a quien administra
    // cuelga de /admin, así que la capacidad ya basta para etiquetar la salida.
    leadsToConsole: canAccessAdmin,
  }
}

function VerifyingLinkScreen() {
  const { t } = useLanguage()

  return (
    <RecoveryCard>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {t.passwordReset.verifying}
        </h1>
        <CardDescription>{t.passwordReset.verifyingHint}</CardDescription>
      </CardHeader>
    </RecoveryCard>
  )
}

function LinkRejectedScreen({ reason }: { reason: EmailLinkRejection }) {
  const { t } = useLanguage()
  const router = useRouter()
  const [recoveryOpen, setRecoveryOpen] = useState(false)

  const explanation = {
    noTokenInLink: t.passwordReset.linkMissing,
    verificationUnavailable: t.passwordReset.verificationUnavailable,
    refusedByAuth: t.passwordReset.linkExpired,
  }[reason.cause]

  return (
    <RecoveryCard>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {t.passwordReset.linkRejected}
        </h1>
        <CardDescription>{explanation}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {reason.cause === "refusedByAuth" && (
          <Alert variant="destructive">
            <AlertDescription>{reason.detail}</AlertDescription>
          </Alert>
        )}
        {/* D9: el callejón sin salida era el defecto, así que pedir otro link se
            hace aquí mismo, con el mismo diálogo que el header y el login. */}
        <div className="flex flex-col gap-2">
          <Button type="button" className="w-full" onClick={() => setRecoveryOpen(true)}>
            {t.passwordReset.requestNewLink}
          </Button>
          {/* "/" no es una salida: en el subdominio de una tienda sin publicar
              el proxy lo reescribe al aviso del que venía esta persona, y aquí
              todavía no hay sesión con la que decidir otra cosa. El login sí se
              sirve tal cual en los dos hosts. */}
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/login">{t.header.backToLogin}</Link>
          </Button>
        </div>
      </CardContent>
      <PasswordRecoveryDialog
        open={recoveryOpen}
        onOpenChange={setRecoveryOpen}
        // "Volver" aquí solo puede ser el login del auth journey: esta pantalla
        // se sirve igual en el host admin y en el subdominio de una tienda, y el
        // único inicio de sesión que existe en ambos es /auth/login (el de la
        // tienda es un modal del header, que esta página no controla).
        onBackToSignIn={() => router.push("/auth/login")}
      />
    </RecoveryCard>
  )
}

function NewPasswordScreen({ exit, onUpdated }: { exit: RecoveryExit; onUpdated: () => void }) {
  const { t } = useLanguage()
  const [newPassword, setNewPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({})

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()

    const problem = findPasswordProblem({ newPassword, confirmation })
    if (problem) {
      const message = {
        incomplete: t.header.incompleteFieldsDescription,
        tooShort: t.header.passwordMinLength,
        mismatch: t.header.passwordsDoNotMatch,
      }[problem]
      setFieldErrors(blamePasswordFields({ problem, message, typed: { newPassword, confirmation } }))
      toast.error(message)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)
    setFailure(null)
    const result = await updatePassword(newPassword)
    setIsSubmitting(false)

    if (!result.success) {
      const detail = result.error || t.passwordReset.updateFailed
      setFailure(detail)
      toast.error(t.passwordReset.updateFailed, { description: detail, duration: 5000 })
      return
    }

    toast.success(t.passwordReset.updated, {
      description: t.passwordReset.updatedHint,
      duration: 3000,
    })
    onUpdated()
  }

  return (
    <RecoveryCard>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {t.auth.resetPassword}
        </h1>
        <CardDescription>{t.passwordReset.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <PasswordField
            id="new-password"
            label={t.passwordReset.newPassword}
            hint={t.header.passwordMinLength}
            error={fieldErrors.newPassword}
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="confirm-password"
            label={t.auth.confirmPassword}
            error={fieldErrors.confirmation}
            value={confirmation}
            onChange={setConfirmation}
          />

          {failure && (
            <Alert variant="destructive">
              <AlertDescription>{failure}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.passwordReset.updating}
                </>
              ) : (
                t.auth.resetPassword
              )}
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={exit.path}>{t.common.cancel}</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </RecoveryCard>
  )
}

// Sin traslado automático a propósito: mover a alguien de pantalla contra su
// voluntad, y encima con un plazo que no puede parar, es justo lo que prohíbe
// WCAG 2.2.1. La salida queda a un clic y es la persona quien lo da.
function PasswordUpdatedScreen({ exit }: { exit: RecoveryExit }) {
  const { t } = useLanguage()

  return (
    <RecoveryCard>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold leading-none tracking-tight">
          {t.passwordReset.updated}
        </h1>
        <CardDescription>{t.passwordReset.updatedHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href={exit.path}>
            {exit.leadsToConsole ? t.passwordReset.goToConsole : t.passwordReset.goHome}
          </Link>
        </Button>
      </CardContent>
    </RecoveryCard>
  )
}

function PasswordField({
  id,
  label,
  hint,
  error,
  value,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useLanguage()
  const [revealed, setRevealed] = useState(false)

  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      {(field) => (
        <div className="relative">
          <Input
            {...field}
            type={revealed ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            className="pr-10 placeholder:opacity-50"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            // size-icon-sm exime al icono del mínimo táctil de 44px en móvil: el
            // control vive dentro de un campo de 36px de alto.
            className="size-icon-sm absolute inset-y-0 right-0"
            aria-label={revealed ? t.header.hidePassword : t.header.showPassword}
            onClick={() => setRevealed(!revealed)}
          >
            {revealed ? <EyeOff /> : <Eye />}
          </Button>
        </div>
      )}
    </FormField>
  )
}

function RecoveryCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  )
}
