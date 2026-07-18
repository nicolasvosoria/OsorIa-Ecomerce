import { getSupabaseEcommerce } from "./client";
import { ECOMMERCE_TABLES } from "./contract";
import { resolveHomeCompositionStoreId } from "./home-composition-api";
import { resolveShopConfig, type ShopConfig } from "@/lib/shop/shop-config";
import { requireAdmin } from "./permissions-api";
import { getAdminRequestHeaders } from "./admin-request-headers";

// Reads the store's saved /shop configuration. Falls back to the default
// config (today's /shop, unchanged) when the store hasn't saved one yet, when
// no store can be resolved, or when the lookup itself fails. `storeId` lets the
// editor read the ACTIVE store; the storefront omits it and stays host-scoped.
export async function getShopConfig(storeId?: string): Promise<ShopConfig> {
  const supabase = getSupabaseEcommerce();
  if (!supabase) return resolveShopConfig(null);

  const resolvedStoreId = await resolveHomeCompositionStoreId(supabase, storeId);
  if (!resolvedStoreId) return resolveShopConfig(null);

  const { data, error } = await supabase
    .from(ECOMMERCE_TABLES.shopConfig)
    .select("config")
    .eq("store_id", resolvedStoreId)
    .maybeSingle();

  if (error) {
    console.error("[v0] Error fetching shop config:", error);
  }

  return resolveShopConfig(data?.config ?? null);
}

export async function updateShopConfig(config: ShopConfig): Promise<ShopConfig> {
  await requireAdmin();

  const response = await fetch("/api/admin/shop-config", {
    method: "POST",
    headers: await getAdminRequestHeaders(),
    body: JSON.stringify({ config }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Failed to update shop config";

    throw new Error(message);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !payload.data
  ) {
    throw new Error("Failed to update shop config: no data returned");
  }

  return payload.data as ShopConfig;
}
