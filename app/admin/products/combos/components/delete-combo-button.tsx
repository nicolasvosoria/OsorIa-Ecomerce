"use client"

import { Trash2 } from "lucide-react"

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
import { deleteComboAction } from "../actions"

export function DeleteComboButton({
  comboId,
  comboName,
}: {
  comboId: string
  comboName: string
}) {
  return (
    <ConfirmActionButton
      onConfirm={() => deleteComboAction(comboId)}
      icon={Trash2}
      triggerAriaLabel={`Eliminar ${comboName}`}
      title="¿Eliminar este combo?"
      description={
        <>
          &ldquo;{comboName}&rdquo; se eliminará permanentemente del catálogo, junto con sus
          componentes. Esta acción no se puede deshacer.
        </>
      }
      confirmLabel="Eliminar"
      successMessage="Combo eliminado"
      errorFallbackMessage="No se pudo eliminar el combo"
    />
  )
}
