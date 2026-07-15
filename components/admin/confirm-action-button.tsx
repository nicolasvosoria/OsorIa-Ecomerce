"use client"

import { useState, useTransition, type ReactNode } from "react"
import { Loader2, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import type { AdminActionResult } from "@/lib/admin/action-result"
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

export function ConfirmActionButton({
  onConfirm,
  icon: Icon,
  triggerAriaLabel,
  title,
  description,
  confirmLabel,
  successMessage,
  errorFallbackMessage,
}: {
  onConfirm: () => Promise<AdminActionResult>
  icon: LucideIcon
  triggerAriaLabel: string
  title: string
  description: ReactNode
  confirmLabel: string
  successMessage: string
  errorFallbackMessage: string
}) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm()
      if (!result.success) {
        toast.error(result.error ?? errorFallbackMessage)
        return
      }

      toast.success(successMessage)
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={triggerAriaLabel}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="editor-chrome">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
