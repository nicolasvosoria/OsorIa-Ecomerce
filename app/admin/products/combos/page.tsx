import { redirect } from "next/navigation"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { listCombos } from "@/lib/supabase/combos-api"
import { getCategories, getItemById, getItems } from "@/lib/supabase/products-api"
import type { ComboCatalogDetails } from "@/lib/combos/types"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"
import { CombosManager } from "./components/combos-manager"

export default async function AdminCombosPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const [list, picker] = await Promise.all([
    loadCombos(authorization.supabase, authorization.storeId),
    loadComboPickerData(authorization.supabase, authorization.storeId),
  ])

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Combos de productos"
        subtitle="Crea combos vendibles con descuento y stock derivado."
      />

      <CombosManager
        combos={list.state === "ready" ? list.combos : []}
        state={list.state}
        products={picker.products}
        categories={picker.categories}
      />
    </AdminPageContainer>
  )
}

type CombosList =
  | { state: "ready"; combos: ComboCatalogDetails[] }
  | { state: "empty" }
  | { state: "error" }

async function loadCombos(supabase: any, storeId: string): Promise<CombosList> {
  try {
    const combos = await listCombos({
      store_id: storeId,
      includeInactive: true,
      supabaseOverride: supabase,
    })

    if (combos.length === 0) {
      return { state: "empty" }
    }

    return { state: "ready", combos }
  } catch (error) {
    console.error("[Admin Combos] Error al cargar combos:", error)
    return { state: "error" }
  }
}

type ComboPickerData = {
  products: StoreItemWithDetails[]
  categories: ItemCategory[]
}

// The picker must be loaded here, not in the client form: a browser fetch has no
// access to the signed active-store cookie and would offer the host store's
// products while createComboAction writes into the entered store.
async function loadComboPickerData(supabase: any, storeId: string): Promise<ComboPickerData> {
  const [productRows, categories] = await Promise.all([
    getItems(
      {
        store_id: storeId,
        limit: 100,
        item_kind: "products",
        is_active: true,
        is_available_for_sale: true,
      },
      supabase,
    ),
    getCategories(false, storeId, supabase),
  ])

  const products = await Promise.all(
    productRows.items.map(async (product) => (await getItemById(product.id, storeId, supabase)) || product),
  )

  return { products, categories }
}
