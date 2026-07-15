"use client"

import { EyeOff, Trash2 } from "lucide-react"

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
import { deactivateCategoryAction, deleteCategoryAction } from "../actions"

type CategoryRowActionsProps = {
  categoryId: string
  categoryName: string
  isActive: boolean
  productCount: number
}

export function CategoryRowActions({
  categoryId,
  categoryName,
  isActive,
  productCount,
}: CategoryRowActionsProps) {
  return (
    <>
      {isActive && (
        <ConfirmActionButton
          onConfirm={() => deactivateCategoryAction(categoryId)}
          icon={EyeOff}
          triggerAriaLabel={`Desactivar ${categoryName}`}
          title="¿Desactivar esta categoría?"
          description={
            <>
              &ldquo;{categoryName}&rdquo; dejará de aparecer en la tienda, pero sus{" "}
              {productsLabel(productCount)} conservan la categoría. Puedes volver a activarla
              editándola.
            </>
          }
          confirmLabel="Desactivar"
          successMessage="Categoría desactivada"
          errorFallbackMessage="No se pudo desactivar la categoría"
        />
      )}
      <ConfirmActionButton
        onConfirm={() => deleteCategoryAction(categoryId)}
        icon={Trash2}
        triggerAriaLabel={`Eliminar ${categoryName}`}
        title="¿Eliminar esta categoría?"
        description={<DeleteWarning categoryName={categoryName} productCount={productCount} />}
        confirmLabel="Eliminar"
        successMessage="Categoría eliminada"
        errorFallbackMessage="No se pudo eliminar la categoría"
      />
    </>
  )
}

function DeleteWarning({
  categoryName,
  productCount,
}: {
  categoryName: string
  productCount: number
}) {
  if (productCount === 0) {
    return (
      <>
        &ldquo;{categoryName}&rdquo; se eliminará permanentemente. No tiene productos asignados.
        Esta acción no se puede deshacer.
      </>
    )
  }

  return (
    <>
      &ldquo;{categoryName}&rdquo; se eliminará permanentemente y{" "}
      <strong>{productsLabel(productCount)} quedarán sin categoría</strong> (no se borran). Esta
      acción no se puede deshacer; si sólo quieres ocultarla, desactívala.
    </>
  )
}

function productsLabel(productCount: number): string {
  return productCount === 1 ? "1 producto" : `${productCount} productos`
}
