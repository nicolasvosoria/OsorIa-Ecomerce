import { redirect } from "next/navigation"

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

  return <CreateProductForm categories={categories} />
}
