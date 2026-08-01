"use client"

import { useState, useTransition } from "react"
import { KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { MIN_PASSWORD_LENGTH } from "@/lib/account/password-rule"
import { updatePassword } from "@/lib/supabase/auth-api"
import { completeForcedPasswordChange } from "./actions"

// A minted owner (D21) lands here on first entry to /admin, holding the temporary
// password the operator handed off. Changing it flows: updatePassword on the live
// session, then the server action clears the flag and forwards to /admin. No
// recovery token or hash to process — the owner already signed in with signIn.
export default function ForcePasswordChangePage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isPending, startTransition] = useTransition()

  const submit = (event: React.FormEvent) => {
    event.preventDefault()

    const validationError = validatePasswordChange(newPassword, confirmPassword)
    if (validationError) {
      toast.error(validationError)
      return
    }

    startTransition(async () => {
      const changed = await updatePassword(newPassword)
      // "same_password" here means Supabase rejected the change because newPassword
      // already matches the account's current password. The temporary password (S8)
      // is a random ~32-char string the owner never types by hand, so this only
      // happens when a prior attempt applied on the server but the client timed out
      // before hearing back — the owner is already on their chosen password, just
      // stuck behind the flag. Treat it as success instead of trapping them in a loop.
      if (!changed.success && changed.code !== "same_password") {
        toast.error(describeUpdatePasswordError(changed.error))
        return
      }

      const cleared = await completeForcedPasswordChange()
      if (!cleared.success) {
        toast.error(cleared.error)
      }
    })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Cambia tu contraseña</CardTitle>
          <CardDescription>
            Recibiste una contraseña temporal. Elige una nueva para entrar al panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              id="new-password"
              label="Nueva contraseña"
              hint={`Mínimo ${MIN_PASSWORD_LENGTH} caracteres.`}
            >
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              )}
            </FormField>
            <FormField id="confirm-password" label="Confirmar nueva contraseña">
              {(field) => (
                <Input
                  {...field}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              )}
            </FormField>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="mr-2 h-4 w-4" />
              )}
              Guardar y entrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// The updatePassword timeout was raised (10s -> 30s) but a slow/loaded server can still
// outlast it. Since the change may have applied anyway, point the owner at the retry
// that self-heals: same_password is now treated as success (see submit above).
function describeUpdatePasswordError(error?: string): string {
  if (error?.includes("Timeout")) {
    return "El cambio pudo haberse aplicado. Intenta de nuevo con la misma contraseña."
  }
  return error ?? "No se pudo actualizar la contraseña"
}

function validatePasswordChange(newPassword: string, confirmPassword: string): string | null {
  if (!newPassword || !confirmPassword) {
    return "Completa ambos campos"
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`
  }
  if (newPassword !== confirmPassword) {
    return "Las contraseñas no coinciden"
  }
  return null
}
