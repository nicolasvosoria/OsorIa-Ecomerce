import { notFound, redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { getCategories } from "@/lib/supabase/products-api"
import { getItemById } from "@/lib/supabase/products-read"
import { EditProductForm } from "./components/edit-product-form"

// The product and its categories are loaded here, not in the form: a browser
// fetch cannot read the signed active-store cookie, so it resolved the host
// store and made this page unreachable for any store entered via the switcher.
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const { storeId, supabase } = authorization
  const [product, categories] = await Promise.all([
    getItemById(id, storeId, supabase),
    getCategories(true, storeId, supabase),
  ])

  if (!product) {
    notFound()
  }

  return (
    <AdminPageContainer maxWidth="4xl">
      <AdminPageHeader title="Editar Producto" subtitle="Modifica la información del producto" />
      <EditProductForm product={product} categories={categories} />
    </AdminPageContainer>
  )
}
