"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ProductForm } from "@/components/admin/products/product-form"
import { defaultProductFormValues } from "@/lib/products/form-values"
import type { ProductFormValues } from "@/lib/products/schemas"
import type { ItemCategory } from "@/lib/types/products"
import { createProductAction } from "../../actions"

const PENDING_LABEL = "Creando..."

export function CreateProductForm({ categories }: { categories: ItemCategory[] }) {
  const router = useRouter()

  const createProduct = async (values: ProductFormValues): Promise<boolean> => {
    try {
      const result = await createProductAction(values)
      if (result.success) return true

      toast.error(result.error || "Error al crear el producto")
      return false
    } catch (error) {
      console.error("[Create Product] Error:", error)
      toast.error(error instanceof Error ? error.message : "Error inesperado al crear el producto")
      return false
    }
  }

  return (
    <ProductForm
      categories={categories}
      defaultValues={defaultProductFormValues}
      submitActions={[
        {
          label: "Crear Producto",
          pendingLabel: PENDING_LABEL,
          onSubmit: async (values) => {
            if (!(await createProduct(values))) return

            toast.success("Producto creado exitosamente")
            router.push("/admin/products")
          },
        },
        {
          label: "Guardar y crear otro",
          pendingLabel: PENDING_LABEL,
          variant: "outline",
          onSubmit: async (values, form) => {
            if (!(await createProduct(values))) return

            form.resetToDefaults()
            toast.success("Producto creado exitosamente. Puedes crear otro producto.")
          },
        },
      ]}
    />
  )
}
