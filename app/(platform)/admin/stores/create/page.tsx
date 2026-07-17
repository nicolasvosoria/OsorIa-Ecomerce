import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { StoreForm } from "@/components/admin/stores/store-form"
import { authorizeSuperAdmin } from "@/lib/supabase/active-store"

export default async function CreateStorePage() {
  const authorization = await authorizeSuperAdmin()
  if ("error" in authorization) {
    redirect("/admin/stores")
  }

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader
        title="Crear tienda"
        subtitle="Aprovisiona una tienda nueva y designa a su dueño"
      />
      <StoreForm />
    </AdminPageContainer>
  )
}
