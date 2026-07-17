"use client"

import { useState, useTransition } from "react"
import { KeyRound, Loader2 } from "lucide-react"
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
import { grantSelfSupportAccessAction } from "../actions"

// La fricción de dos pasos es deliberada (D3): confirmar aquí solo te hace
// miembro; "Entrar a tienda" sigue siendo el clic aparte cuando la fila refresca.
export function SupportAccessButton({
  storeId,
  storeName,
}: {
  storeId: string
  storeName: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await grantSelfSupportAccessAction(storeId)
      if (!result.success) {
        toast.error(result.error ?? `No se pudo obtener acceso a ${storeName}`)
        return
      }

      toast.success(`Ya tienes acceso de soporte en ${storeName}`)
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <KeyRound className="h-4 w-4" />
          <span>Obtener acceso</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="editor-chrome">
        <AlertDialogHeader>
          <AlertDialogTitle>Obtener acceso de soporte</AlertDialogTitle>
          <AlertDialogDescription>
            Te asignarás una membresía de administrador en {storeName}. El equipo de la
            tienda la verá como acceso de soporte y su dueño podrá revocarla en cualquier
            momento.
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
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Obtener acceso"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
