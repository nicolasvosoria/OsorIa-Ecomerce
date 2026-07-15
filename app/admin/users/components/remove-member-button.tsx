"use client"

import { useState, useTransition } from "react"
import { Loader2, UserMinus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
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
import { removeMembershipAction } from "../actions"

export function RemoveMemberButton({
  userId,
  memberLabel,
}: {
  userId: string
  memberLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await removeMembershipAction(userId)
      if (result.success) {
        toast.success("Miembro eliminado del equipo")
        setOpen(false)
        return
      }

      toast.error(result.error ?? "No se pudo eliminar al miembro")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={`Quitar a ${memberLabel} del equipo`}
        >
          <UserMinus className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Quitar a este miembro?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{memberLabel}&rdquo; perderá el acceso de administración a esta tienda. Podrás
            volver a agregarlo por correo más adelante.
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
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Quitar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
