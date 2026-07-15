import { redirect } from "next/navigation"

import { ComboForm } from "@/components/admin/combos/combo-form"
import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { emptyComboFormValues } from "@/lib/combos/form-values"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { loadComboPickerData } from "@/lib/supabase/combo-picker-api"
import { createComboAction } from "../actions"

export default async function CreateComboPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const picker = await loadComboPickerData(authorization.supabase, authorization.storeId)

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader
        title="Crear Nuevo Combo"
        subtitle="Combina productos del catálogo en un combo vendible con descuento"
      />
      <ComboForm
        products={picker.products}
        categories={picker.categories}
        defaultValues={emptyComboFormValues}
        submitLabel="Crear Combo"
        pendingLabel="Creando..."
        successMessage="Combo creado"
        onSubmit={createComboAction}
      />
    </AdminPageContainer>
  )
}
