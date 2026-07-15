"use server"

import { revalidatePath } from "next/cache"

import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import {
  createCombo,
  deleteCombo,
  updateCombo,
  type ComboComponentInput,
  type CreateComboData,
  type UpdateComboData,
} from "@/lib/supabase/combos-api"
import type { ComboComponentFormValues, ComboFormValues } from "@/lib/combos/schemas"

const COMBOS_PATH = "/admin/products/combos"

export type ComboActionResult = { success: boolean; error?: string }

export async function createComboAction(input: ComboFormValues): Promise<ComboActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const data: CreateComboData = { ...buildComboFields(input), store_id: storeId }

  const result = await createCombo(data, supabase)
  if (result.success) {
    revalidatePath(COMBOS_PATH)
  }

  return { success: result.success, error: result.error }
}

export async function updateComboAction(
  id: string,
  input: ComboFormValues,
): Promise<ComboActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization
  const data: UpdateComboData = buildComboFields(input)

  const result = await updateCombo(id, data, storeId, supabase)
  if (result.success) {
    revalidatePath(COMBOS_PATH)
  }

  return { success: result.success, error: result.error }
}

export async function deleteComboAction(id: string): Promise<void> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    throw new Error(authorization.error)
  }

  const { supabase, storeId } = authorization
  const result = await deleteCombo(id, storeId, supabase)
  if (!result.success) {
    throw new Error(result.error || "No se pudo eliminar el combo")
  }

  revalidatePath(COMBOS_PATH)
}

function buildComboFields(input: ComboFormValues): Omit<CreateComboData, "store_id"> {
  return {
    name: input.name,
    slug: input.slug || undefined,
    category_id: input.category_id || null,
    description: input.description || undefined,
    image_url: input.image_url || undefined,
    is_active: input.is_active,
    discount_type: input.discount_type,
    discount_value: Number(input.discount_value || 0),
    components: buildComponentInputs(input.components),
  }
}

function buildComponentInputs(components: ComboComponentFormValues[]): ComboComponentInput[] {
  return components
    .filter((component) => component.product_id)
    .map((component, index) => ({
      product_id: component.product_id,
      variant_id: component.variant_id || null,
      quantity: Math.max(1, Number.parseInt(component.quantity, 10) || 1),
      display_order: index,
    }))
}
