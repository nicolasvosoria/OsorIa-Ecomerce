"use client"

import { UserMinus } from "lucide-react"

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
import { removeMembershipAction } from "../actions"

export function RemoveMemberButton({
  userId,
  memberLabel,
}: {
  userId: string
  memberLabel: string
}) {
  return (
    <ConfirmActionButton
      onConfirm={() => removeMembershipAction(userId)}
      icon={UserMinus}
      triggerAriaLabel={`Quitar a ${memberLabel} del equipo`}
      title="¿Quitar a este miembro?"
      description={
        <>
          &ldquo;{memberLabel}&rdquo; perderá el acceso de administración a esta tienda. Podrás
          volver a agregarlo por correo más adelante.
        </>
      }
      confirmLabel="Quitar"
      successMessage="Miembro eliminado del equipo"
      errorFallbackMessage="No se pudo eliminar al miembro"
    />
  )
}
