import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { loadHomeDiscountPopupConfig } from "@/lib/home-discount-popup-admin"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { HomeDiscountPopupForm } from "./components/home-discount-popup-form"

// La promo se lee aquí y no en el formulario: un fetch desde el navegador no
// puede leer la cookie firmada de tienda activa, así que resolvía la tienda del
// host y mostraba la promo de una tienda mientras el guardado escribía en otra.
export default async function HomeDiscountPopupConfigPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { supabase, storeId } = authorization
  const { config } = await loadHomeDiscountPopupConfig(supabase, storeId)

  return (
    <AdminPageContainer maxWidth="5xl">
      <AdminPageHeader
        title="Popup de descuento en home"
        subtitle="Configura una sola promo flotante para la portada de la tienda."
      />
      <HomeDiscountPopupForm defaultValues={config} />
    </AdminPageContainer>
  )
}
