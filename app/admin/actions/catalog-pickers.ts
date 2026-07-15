"use server"

import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { getCategories, getItems } from "@/lib/supabase/products-api"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"

export async function listActiveStoreCategories(): Promise<ItemCategory[]> {
  const { supabase, storeId } = await requireActiveStoreGrant()

  return getCategories(false, storeId, supabase)
}

export async function listActiveStoreItems(): Promise<StoreItemWithDetails[]> {
  const { supabase, storeId } = await requireActiveStoreGrant()

  const result = await getItems(
    {
      store_id: storeId,
      is_active: true,
      limit: 100,
      order_by: "item_name",
      order_direction: "asc",
    },
    supabase,
  )

  return result.items
}

async function requireActiveStoreGrant() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    throw new Error(authorization.error)
  }

  return authorization
}
