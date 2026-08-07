import { ECOMMERCE_TABLES } from "./contract"
import {
  SHIPPING_MODES,
  UNMATCHED_DESTINATION_ACTIONS,
  type ShippingMode,
  type UnmatchedDestinationAction,
} from "@/lib/shipping/schemas"

export type ShippingSettings = {
  mode: ShippingMode
  unmatchedDestinationAction: UnmatchedDestinationAction
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  mode: "coordinate",
  unmatchedDestinationAction: "block",
}

// A missing row means the store has never customized its shipping mode, so it
// reads as the born default (D11/D17) -- the same "missing row = default"
// shape ecommerce.shop_config already uses, never a backfilled row per store.
export async function loadShippingSettings(supabase: any, storeId: string): Promise<ShippingSettings> {
  const { data, error } = await supabase
    .from(ECOMMERCE_TABLES.storeShippingSettings)
    .select("mode, unmatched_destination_action")
    .eq("store_id", storeId)
    .maybeSingle()

  if (error) {
    throw new Error("No se pudo leer la configuración de envío", { cause: error })
  }

  return resolveShippingSettings(data?.mode, data?.unmatched_destination_action)
}

export async function saveShippingMode(supabase: any, storeId: string, mode: ShippingMode): Promise<void> {
  const { error } = await supabase
    .from(ECOMMERCE_TABLES.storeShippingSettings)
    .upsert({ store_id: storeId, mode }, { onConflict: "store_id" })

  if (error) {
    throw new Error("No se pudo guardar el modo de envío", { cause: error })
  }
}

// D7: the mode-only admin selector never wrote this column (S2); this is the
// slice where zones exist, so "destination with no matching zone" finally
// means something and gets its own save path -- upsert only touches the
// column it names, so saveShippingMode's own upsert above never wipes it.
export async function saveUnmatchedDestinationAction(
  supabase: any,
  storeId: string,
  unmatchedDestinationAction: UnmatchedDestinationAction,
): Promise<void> {
  const { error } = await supabase
    .from(ECOMMERCE_TABLES.storeShippingSettings)
    .upsert({ store_id: storeId, unmatched_destination_action: unmatchedDestinationAction }, { onConflict: "store_id" })

  if (error) {
    throw new Error("No se pudo guardar la acción para destinos sin zona", { cause: error })
  }
}

function resolveShippingSettings(storedMode: unknown, storedUnmatchedDestinationAction: unknown): ShippingSettings {
  const mode =
    typeof storedMode === "string" && SHIPPING_MODES.includes(storedMode as ShippingMode)
      ? (storedMode as ShippingMode)
      : DEFAULT_SHIPPING_SETTINGS.mode

  const unmatchedDestinationAction =
    typeof storedUnmatchedDestinationAction === "string" &&
    UNMATCHED_DESTINATION_ACTIONS.includes(storedUnmatchedDestinationAction as UnmatchedDestinationAction)
      ? (storedUnmatchedDestinationAction as UnmatchedDestinationAction)
      : DEFAULT_SHIPPING_SETTINGS.unmatchedDestinationAction

  return { mode, unmatchedDestinationAction }
}
