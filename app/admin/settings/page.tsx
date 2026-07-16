import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"
import { StorePublicationPanel } from "./components/store-publication-panel"

export default async function StoreSettingsPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { supabase, storeId } = authorization
  const { data: store, error } = await supabase
    .from(ECOMMERCE_TABLES.stores)
    .select("store_name, is_public")
    .eq("id", storeId)
    .maybeSingle()

  if (error || !store) {
    console.error("[Store Settings] Error al leer la tienda:", error)
    redirect("/admin")
  }

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader
        title="Configuración"
        subtitle={`Ajustes generales de ${store.store_name}`}
      />
      <StorePublicationPanel initialIsPublic={store.is_public ?? false} />
    </AdminPageContainer>
  )
}
