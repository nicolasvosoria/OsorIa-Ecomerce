"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ProductForm } from "@/components/admin/products/product-form"
import { toProductFormValues } from "@/lib/products/form-values"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"
import { updateProductAction } from "../../../actions"

type EditProductFormProps = {
  product: StoreItemWithDetails
  categories: ItemCategory[]
}

export function EditProductForm({ product, categories }: EditProductFormProps) {
  const router = useRouter()

  return (
    <ProductForm
      categories={categories}
      defaultValues={toProductFormValues(product)}
      submitActions={[
        {
          label: "Guardar Cambios",
          pendingLabel: "Guardando...",
          onSubmit: async (values) => {
            try {
              const result = await updateProductAction(product.id, values)
              if (!result.success) {
                toast.error(result.error || "Error al actualizar el producto")
                return
              }

              toast.success("Producto actualizado exitosamente")
              router.push("/admin/products")
            } catch (error) {
              console.error("[Edit Product] Error:", error)
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Error inesperado al actualizar el producto",
              )
            }
          },
        },
      ]}
    />
  )
}
