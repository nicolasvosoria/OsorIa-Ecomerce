import { notFound, redirect } from "next/navigation"

import { CategoryForm } from "@/components/admin/categories/category-form"
import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { toCategoryFormValues } from "@/lib/categories/form-values"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { getCategoryById } from "@/lib/supabase/categories-api"
import { updateCategoryAction } from "../../actions"

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { storeId, supabase } = authorization
  const category = await getCategoryById(id, storeId, supabase)

  if (!category) {
    notFound()
  }

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader title="Editar Categoría" subtitle="Modifica la información de la categoría" />
      <CategoryForm
        defaultValues={toCategoryFormValues(category)}
        submitLabel="Guardar Cambios"
        pendingLabel="Guardando..."
        successMessage="Categoría actualizada"
        onSubmit={updateCategoryAction.bind(null, category.id)}
      />
    </AdminPageContainer>
  )
}
