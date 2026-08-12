"use server"

import { revalidatePath } from "next/cache"

import type { AdminActionResult } from "@/lib/admin/action-result"
import {
  shippingModeFormSchema,
  shippingZoneActionSchema,
  unmatchedDestinationActionFormSchema,
} from "@/lib/shipping/schemas"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { listDepartments, listMunicipalitiesByDepartment, type Department, type Municipality } from "@/lib/shipping/locations-api"
import { saveShippingMode, saveUnmatchedDestinationAction } from "@/lib/supabase/shipping-settings-api"
import { deleteShippingZone, saveShippingZone } from "@/lib/supabase/shipping-zones-api"

const SHIPPING_SETTINGS_PATH = "/admin/settings/shipping"
const SETTINGS_PATH = "/admin/settings"
const INVALID_INPUT = "Los datos no son válidos. Revisa el formulario e intenta de nuevo."

// D13/D27: storeId always comes from the active-store gate, never from the
// client -- the same authority shape every other settings action in this
// console uses (setActiveStorePublication, updateStoreIdentityFields).
export async function updateShippingModeAction(input: unknown): Promise<AdminActionResult> {
  const parsed = shippingModeFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization

  try {
    await saveShippingMode(supabase, storeId, parsed.data.mode)
  } catch (error) {
    console.error("[Shipping Settings] Error al guardar el modo de envío:", error)
    // D31: no server literal here -- shipping.saveErrorToast (lib/i18n/
    // translations.ts) is the one declaration of this message; the console's
    // own `result.error || copy.saveErrorToast` only renders it when
    // result.error is falsy.
    return { success: false }
  }

  revalidatePath(SHIPPING_SETTINGS_PATH)
  revalidatePath(SETTINGS_PATH)
  return { success: true }
}

// D7: wires up the column store_shipping_settings.unmatched_destination_action
// already carried, unused, since wave 1 -- this is the slice where zones
// exist, so "no matching zone" finally has an outcome to choose.
export async function updateUnmatchedDestinationActionAction(input: unknown): Promise<AdminActionResult> {
  const parsed = unmatchedDestinationActionFormSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization

  try {
    await saveUnmatchedDestinationAction(supabase, storeId, parsed.data.unmatchedDestinationAction)
  } catch (error) {
    console.error("[Shipping Settings] Error al guardar la acción para destinos sin zona:", error)
    // D31: see updateShippingModeAction above -- shipping.zones.
    // unmatchedDestinationSaveErrorToast is the one declaration.
    return { success: false }
  }

  revalidatePath(SHIPPING_SETTINGS_PATH)
  return { success: true }
}

// D3/D5/D6: the client already narrows its rate-ladder form state and runs
// findShippingLadderGaps before calling this, but neither the shape nor the
// gap rule can be trusted from the client -- both are re-validated here, and
// saveShippingZone re-checks the destination-conflict and weight-gate rules
// (D3, D8) against the store's current data regardless of what the client saw.
export async function saveShippingZoneAction(
  input: unknown,
  zoneId?: string,
): Promise<AdminActionResult> {
  const parsed = shippingZoneActionSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: INVALID_INPUT }
  }

  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization

  try {
    const result = await saveShippingZone(supabase, storeId, parsed.data, zoneId)
    if (!result.success) {
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("[Shipping Settings] Error al guardar la zona de envío:", error)
    // D31: see updateShippingModeAction above -- shipping.zones.saveErrorToast
    // is the one declaration.
    return { success: false }
  }

  revalidatePath(SHIPPING_SETTINGS_PATH)
  return { success: true }
}

export async function deleteShippingZoneAction(zoneId: string): Promise<AdminActionResult> {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    return { success: false, error: authorization.error }
  }

  const { supabase, storeId } = authorization

  try {
    const result = await deleteShippingZone(supabase, storeId, zoneId)
    if (!result.success) {
      return { success: false, error: result.error }
    }
  } catch (error) {
    console.error("[Shipping Settings] Error al eliminar la zona de envío:", error)
    // D31: see updateShippingModeAction above -- shipping.zones.deleteErrorToast
    // is the one declaration.
    return { success: false }
  }

  revalidatePath(SHIPPING_SETTINGS_PATH)
  return { success: true }
}

// D28's chained picker (department, then municipio filtered to it), reused
// here for the zone destination picker -- both server actions require the
// same active-store admin grant every other picker action in this console
// does (app/admin/actions/catalog-pickers.ts), even though co_locations is
// public data, so the zones screen has a single authority path throughout.
export async function listShippingDepartmentsAction(): Promise<Department[]> {
  const { supabase } = await requireActiveStoreGrant()
  return listDepartments(supabase)
}

export async function listShippingMunicipalitiesAction(departmentCode: string): Promise<Municipality[]> {
  const { supabase } = await requireActiveStoreGrant()
  return listMunicipalitiesByDepartment(departmentCode, supabase)
}

async function requireActiveStoreGrant() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    throw new Error(authorization.error)
  }

  return authorization
}
