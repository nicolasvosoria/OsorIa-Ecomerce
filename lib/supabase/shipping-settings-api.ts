import { ECOMMERCE_TABLES } from "./contract"
import { SHIPPING_MODES, type ShippingMode } from "@/lib/shipping/schemas"

export type ShippingSettings = {
  mode: ShippingMode
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = { mode: "coordinate" }

// A missing row means the store has never customized its shipping mode, so it
// reads as the born default (D11/D17) -- the same "missing row = default"
// shape ecommerce.shop_config already uses, never a backfilled row per store.
export async function loadShippingSettings(supabase: any, storeId: string): Promise<ShippingSettings> {
  const { data, error } = await supabase
    .from(ECOMMERCE_TABLES.storeShippingSettings)
    .select("mode")
    .eq("store_id", storeId)
    .maybeSingle()

  if (error) {
    throw new Error("No se pudo leer la configuración de envío", { cause: error })
  }

  return resolveShippingSettings(data?.mode)
}

export async function saveShippingMode(supabase: any, storeId: string, mode: ShippingMode): Promise<void> {
  const { error } = await supabase
    .from(ECOMMERCE_TABLES.storeShippingSettings)
    .upsert({ store_id: storeId, mode }, { onConflict: "store_id" })

  if (error) {
    throw new Error("No se pudo guardar el modo de envío", { cause: error })
  }
}

function resolveShippingSettings(storedMode: unknown): ShippingSettings {
  const mode =
    typeof storedMode === "string" && SHIPPING_MODES.includes(storedMode as ShippingMode)
      ? (storedMode as ShippingMode)
      : DEFAULT_SHIPPING_SETTINGS.mode

  return { mode }
}
