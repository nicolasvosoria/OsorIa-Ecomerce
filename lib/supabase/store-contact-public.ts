import { getSupabaseEcommerce } from "./client"
import { ECOMMERCE_TABLES } from "./contract"
import { getRuntimeStoreId } from "@/lib/utils/store"

// D14: the storefront needs the store's phone for the coordinate mode's
// WhatsApp button (components/ui/floating-contact-button.tsx) and the
// checkout coordination copy (app/checkout/page.tsx), but PUBLIC_STORE_SELECT
// deliberately excludes every store_contact column
// (lib/security/store-contract.ts:26) so a customer-facing query can't
// reopen the mailbox columns 20260806000600 locked down. This loader selects
// nothing else -- contact_phone is the one store_contact column that
// migration's grant still leaves public, so the plain anon-key client is
// enough here (no service role, unlike lib/supabase/store-identity-api.ts's
// loadStoreIdentity, which also reads columns that grant never covers).
export async function loadPublicStoreContactPhone(storeId?: string): Promise<string | null> {
  const supabase = getSupabaseEcommerce()
  if (!supabase) return null

  const resolvedStoreId = storeId ?? (await getRuntimeStoreId())
  if (!resolvedStoreId) return null

  const { data, error } = await supabase
    .from(ECOMMERCE_TABLES.storeContact)
    .select("contact_phone")
    .eq("store_id", resolvedStoreId)
    .maybeSingle()

  if (error) {
    console.error("[StoreContactPublic] No se pudo leer el teléfono de la tienda:", error)
    return null
  }

  return data?.contact_phone ?? null
}
