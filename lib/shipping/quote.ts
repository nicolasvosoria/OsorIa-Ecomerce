import { getServiceEcommerceClient } from "@/lib/supabase/service-client"
import { resolveShipping, type ShippingResolution, type ShippingResolutionInput } from "@/lib/shipping/resolver"

const SERVICE_CLIENT_NOT_CONFIGURED_MESSAGE = "Supabase service role no configurado"

export type ShippingQuoteInput = ShippingResolutionInput

// D27: shipping_zones/shipping_rates (and store_shipping_settings) are
// closed to anon and to authenticated shoppers -- only service_role can read
// them -- so the checkout preview a later slice builds must go through this,
// never a client-side call to the resolver directly. This is the "quote
// entry point": a thin pass-through into resolveShipping so quoting and the
// order write (lib/supabase/orders-api.ts's createOrder) share the exact
// same computation and cannot disagree, structurally rather than by
// convention. It stays a plain function -- no "use server" here -- the same
// posture orders-api.ts's own createOrder takes, so the "use server" action
// that wires this to the UI can unit-test it directly.
export async function quoteShipping(
  input: ShippingQuoteInput,
  supabaseOverride?: any,
): Promise<ShippingResolution> {
  const supabase = supabaseOverride ?? getServiceEcommerceClient()
  if (!supabase) {
    throw new Error(SERVICE_CLIENT_NOT_CONFIGURED_MESSAGE)
  }

  return resolveShipping(supabase, input)
}
