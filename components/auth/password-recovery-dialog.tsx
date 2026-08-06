"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"

import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/auth/turnstile-widget"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/language-context"
import { resetPassword } from "@/lib/supabase/auth-api"

interface PasswordRecoveryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Cada superficie decide qué es "volver": el header reabre su modal de login y
  // el login del host admin simplemente vuelve a su formulario, que está detrás.
  onBackToSignIn: () => void
}

// Única entrada de recuperación de contraseña del producto (D8). La abren el
// header del storefront y el login del host admin, así que no puede asumir el
// chrome de ninguno de los dos: todo sale de tokens semánticos y de las
// primitivas compartidas.
export function PasswordRecoveryDialog({
  open,
  onOpenChange,
  onBackToSignIn,
}: PasswordRecoveryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[95vw] max-w-[450px] overflow-y-auto">
        <RecoveryLinkRequest
          onCancel={() => onOpenChange(false)}
          onBackToSignIn={onBackToSignIn}
        />
      </DialogContent>
    </Dialog>
  )
}

interface RecoveryLinkRequestProps {
  onCancel: () => void
  onBackToSignIn: () => void
}

// Vive dentro del DialogContent a propósito: Radix lo desmonta al cerrar, así
// que el correo escrito y la confirmación se descartan solos y el modal siempre
// vuelve a abrirse en el formulario.
function RecoveryLinkRequest({ onCancel, onBackToSignIn }: RecoveryLinkRequestProps) {
  const { t } = useLanguage()
  const [email, setEmail] = useState("")
  // La dirección confirmada, no un booleano: no existe "enviado" sin saber a
  // quién, y es lo que se muestra en la confirmación.
  const [sentTo, setSentTo] = useState<string | null>(null)
  // El toast se va solo y aparece lejos del campo: el mismo mensaje se queda en
  // el correo, que es lo que anuncian aria-invalid y aria-describedby.
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileWidgetHandle>(null)

  const requestRecoveryLink = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!email) {
      setEmailError(t.header.enterEmail)
      toast.error(t.common.error, {
        description: t.header.enterEmail,
        duration: 3000,
      })
      return
    }

    setEmailError(undefined)
    const result = await resetPassword(email, turnstileToken)
    if (!result.success) {
      turnstileRef.current?.reset()
      const detail = result.error || t.header.recoveryLinkErrorHint
      setEmailError(detail)
      toast.error(t.header.recoveryLinkError, {
        description: detail,
        duration: 5000,
      })
      return
    }

    setSentTo(email)
    toast.success(t.header.emailSent, {
      description: t.header.checkEmail,
      duration: 5000,
    })
  }

  if (sentTo) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-xl">{t.header.emailSent}</DialogTitle>
          <DialogDescription>{t.header.forgotPasswordDescription2}</DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm">{t.header.recoveryLinkSentTo}</p>
            <p className="mt-2 text-sm font-semibold text-primary">{sentTo}</p>
            <p className="mt-4 text-xs text-muted-foreground">{t.header.recoveryLinkSpamHint}</p>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button type="button" variant="outline" className="w-full" onClick={onBackToSignIn}>
              {t.header.backToLogin}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-primary"
              onClick={() => {
                setSentTo(null)
                setEmail("")
              }}
            >
              {t.header.sendToAnotherEmail}
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">{t.header.forgotPasswordTitle}</DialogTitle>
        <DialogDescription>{t.header.forgotPasswordDescription}</DialogDescription>
      </DialogHeader>

      <form onSubmit={requestRecoveryLink} className="mt-4 space-y-4">
        <FormField id="password-recovery-email" label={t.auth.email} error={emailError}>
          {(field) => (
            <Input
              {...field}
              type="email"
              required
              placeholder={t.header.emailPlaceholder}
              className="placeholder:opacity-50"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          )}
        </FormField>

        {/* D26: no-op (renders nothing) until NEXT_PUBLIC_TURNSTILE_SITE_KEY
            is set -- see components/auth/turnstile-widget.tsx. */}
        <TurnstileWidget ref={turnstileRef} onToken={setTurnstileToken} />

        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" className="w-full">
            {t.header.sendRecoveryLink}
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={onCancel}>
            {t.common.cancel}
          </Button>
        </div>
      </form>
    </>
  )
}
