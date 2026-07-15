import { notFound, redirect } from "next/navigation"

import { ComboForm } from "@/components/admin/combos/combo-form"
import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { toComboFormValues } from "@/lib/combos/form-values"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { loadComboPickerData } from "@/lib/supabase/combo-picker-api"
import { listCombos } from "@/lib/supabase/combos-api"
import { updateComboAction } from "../../actions"

export default async function EditComboPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { storeId, supabase } = authorization
  const [combo, picker] = await Promise.all([
    findStoreCombo(id, storeId, supabase),
    loadComboPickerData(supabase, storeId),
  ])

  if (!combo) {
    notFound()
  }

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader title="Editar Combo" subtitle="Modifica la información del combo" />
      <ComboForm
        products={picker.products}
        categories={picker.categories}
        defaultValues={toComboFormValues(combo)}
        submitLabel="Guardar Cambios"
        pendingLabel="Guardando..."
        successMessage="Combo actualizado"
        onSubmit={updateComboAction.bind(null, combo.id)}
      />
    </AdminPageContainer>
  )
}

// listCombos hidrata en lote, así que buscar dentro de los combos de la tienda
// cuesta lo mismo que leer uno y deja el alcance de tienda en la consulta, cosa
// que getComboById no hace.
async function findStoreCombo(comboId: string, storeId: string, supabase: any) {
  const combos = await listCombos({
    store_id: storeId,
    includeInactive: true,
    supabaseOverride: supabase,
  })

  return combos.find((combo) => combo.id === comboId)
}
