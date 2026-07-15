import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { getCategories } from "@/lib/supabase/products-api"
import { CreateProductForm } from "./components/create-product-form"

// Categories are loaded here, not in the form: a browser fetch cannot read the
// signed active-store cookie and would offer the host store's categories while
// createProductAction writes into the entered store.
export default async function CreateProductPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const categories = await getCategories(true, authorization.storeId, authorization.supabase)

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Crear Nuevo Producto"
        subtitle="Completa el formulario para agregar un nuevo producto al catálogo"
      />
      <CreateProductForm categories={categories} />
    </AdminPageContainer>
  )
}
