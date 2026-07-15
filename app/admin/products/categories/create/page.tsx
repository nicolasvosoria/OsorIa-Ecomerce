import { redirect } from "next/navigation"

import { CategoryForm } from "@/components/admin/categories/category-form"
import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { emptyCategoryFormValues } from "@/lib/categories/form-values"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { createCategoryAction } from "../actions"

export default async function CreateCategoryPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader
        title="Crear Nueva Categoría"
        subtitle="Agrupa productos y dale una página propia en el catálogo"
      />
      <CategoryForm
        defaultValues={emptyCategoryFormValues}
        submitLabel="Crear Categoría"
        pendingLabel="Creando..."
        successMessage="Categoría creada"
        onSubmit={createCategoryAction}
      />
    </AdminPageContainer>
  )
}
