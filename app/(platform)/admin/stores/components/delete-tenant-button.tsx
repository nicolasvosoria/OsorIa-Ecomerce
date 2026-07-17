"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
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
import { Button, buttonVariants } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { softDeleteTenant } from "../tenant-lifecycle-actions"

const STORES_PATH = "/admin/stores"

// D7(c): soft delete, never a hard delete or an undelete UI — recovery stays
// manual (out of scope). The strong confirmation is typing the exact
// subdomain: this only enables the button, the server re-validates it.
export function DeleteTenantButton({
  storeId,
  storeName,
  subdomain,
}: {
  storeId: string
  storeName: string
  subdomain: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmValue, setConfirmValue] = useState("")
  const [isPending, startTransition] = useTransition()
  const canConfirm = confirmValue === subdomain

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      setConfirmValue("")
    }
  }

  function handleConfirm() {
    if (!canConfirm) return

    startTransition(async () => {
      const result = await softDeleteTenant(storeId, confirmValue)
      if (!result.success) {
        toast.error(result.error ?? `No se pudo eliminar ${storeName}`)
        return
      }

      toast.success(`${storeName} eliminada`)
      router.push(STORES_PATH)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5">
          <Trash2 className="h-4 w-4" />
          <span>Eliminar tienda</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="editor-chrome">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {storeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            La tienda desaparece de esta consola y su dominio deja de servirla (sus
            visitantes verán que no existe). La recuperación es manual y no está
            disponible desde aquí.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <FormField
          id="confirm-subdomain"
          label={
            <>
              Escribe <span className="font-mono text-foreground">{subdomain}</span> para
              confirmar
            </>
          }
        >
          {(field) => (
            <Input
              {...field}
              value={confirmValue}
              onChange={(event) => setConfirmValue(event.target.value)}
              placeholder={subdomain}
              autoComplete="off"
            />
          )}
        </FormField>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={(event) => {
              event.preventDefault()
              handleConfirm()
            }}
            disabled={isPending || !canConfirm}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar tienda"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
