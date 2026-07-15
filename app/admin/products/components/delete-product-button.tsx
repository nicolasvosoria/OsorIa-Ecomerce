"use client"

import { Trash2 } from "lucide-react"

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
import { softDeleteProductAction } from "../actions"

export function DeleteProductButton({
  productId,
  productName,
}: {
  productId: string
  productName: string
}) {
  return (
    <ConfirmActionButton
      onConfirm={() => softDeleteProductAction(productId)}
      icon={Trash2}
      triggerAriaLabel={`Eliminar ${productName}`}
      title="¿Eliminar este producto?"
      description={
        <>
          &ldquo;{productName}&rdquo; dejará de mostrarse en tu tienda. Esta acción no borra sus
          datos, pero lo retira del catálogo.
        </>
      }
      confirmLabel="Eliminar"
      successMessage="Producto eliminado"
      errorFallbackMessage="No se pudo eliminar el producto"
    />
  )
}
