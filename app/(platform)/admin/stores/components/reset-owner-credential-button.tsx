"use client"

import { useState, useTransition } from "react"
import { KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { TempPasswordReveal } from "@/components/admin/temp-password-reveal"
import { resetOwnerCredentialAction } from "../actions"

// D7: la credencial pertenece a la cuenta de PLATAFORMA del dueño (#2347), no
// solo a esta tienda — el diálogo lo dice sin rodeos antes de confirmar. La
// contraseña temporal se enseña una sola vez, igual que al aprovisionar.
export function ResetOwnerCredentialButton({
  storeId,
  ownerEmail,
}: {
  storeId: string
  ownerEmail: string
}) {
  const [open, setOpen] = useState(false)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await resetOwnerCredentialAction(storeId)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      if (result.flagWarning) {
        toast.warning(result.flagWarning)
      } else {
        toast.success(`Credencial de ${result.ownerEmail} restablecida`)
      }
      setTempPassword(result.tempPassword)
      setOpen(false)
    })
  }

  return (
    <div className="space-y-3">
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <KeyRound className="h-4 w-4" />
            <span>Restablecer credencial del dueño</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent className="editor-chrome">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Restablecer la credencial de {ownerEmail}?</AlertDialogTitle>
            <AlertDialogDescription>
              La contraseña pertenece a su cuenta de la plataforma: el inicio de sesión es
              compartido con las demás aplicaciones y su contraseña actual dejará de funcionar
              en todas. Recibirá una contraseña temporal, visible una sola vez, y deberá
              definir una nueva en su próximo inicio de sesión.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleConfirm()
              }}
              disabled={isPending}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Restablecer credencial"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {tempPassword ? (
        <TempPasswordReveal
          value={tempPassword}
          title="Contraseña temporal del dueño"
          recipient="al dueño"
        />
      ) : null}
    </div>
  )
}
