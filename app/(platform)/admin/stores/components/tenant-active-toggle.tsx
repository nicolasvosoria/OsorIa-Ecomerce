"use client"

import { useState, useTransition } from "react"
import { Loader2, Power, PowerOff } from "lucide-react"
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
import { setTenantActive } from "../tenant-lifecycle-actions"

// D7(a): suspending only flips is_active; reactivating flips it back. The
// dialog copy states the real consequence (storefront vs. /admin) so the
// operator never has to guess what the toggle does.
export function TenantActiveToggle({
  storeId,
  storeName,
  isActive,
}: {
  storeId: string
  storeName: string
  isActive: boolean
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await setTenantActive(storeId, !isActive)
      if (!result.success) {
        toast.error(result.error ?? `No se pudo actualizar el estado de ${storeName}`)
        return
      }

      toast.success(isActive ? `${storeName} suspendida` : `${storeName} reactivada`)
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
          <span>{isActive ? "Suspender" : "Reactivar"}</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="editor-chrome">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isActive ? "¿Suspender esta tienda?" : "¿Reactivar esta tienda?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isActive
              ? `El dominio de ${storeName} dejará de mostrar la tienda: sus visitantes verán la página de tienda inactiva. Su equipo seguirá entrando a /admin con normalidad. El cambio puede tardar hasta un minuto en reflejarse.`
              : `El dominio de ${storeName} volverá a servir la tienda, siempre que además esté publicada. El cambio puede tardar hasta un minuto en reflejarse.`}
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
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              "Suspender"
            ) : (
              "Reactivar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
