import { createClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { resolveStoreLookupSubdomain } from "@/lib/utils/store-host";
import { ECOMMERCE_SCHEMA, ECOMMERCE_VIEWS } from "./contract";

export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema(ECOMMERCE_SCHEMA) as any;
}

async function resolveDefaultStoreId(supabase: any) {
  const { data: defaultStore, error } = await supabase
    .from(ECOMMERCE_VIEWS.storesLegacy)
    .select("id")
    .eq("subdomain", "default")
    .single();

  if (error || !defaultStore?.id) {
    throw new Error("Default store not found");
  }

  return defaultStore.id as string;
}

async function resolveStoreIdBySubdomain(supabase: any, subdomain: string) {
  const { data, error } = await supabase
    .from(ECOMMERCE_VIEWS.storesLegacy)
    .select("id")
    .eq("subdomain", subdomain)
    .single();

  if (error || !data?.id) {
    return null;
  }

  return data.id as string;
}

// Trusted target store for admin writes: derived from the request host, never
// from the mutable `store_id` cookie. A stale/unknown subdomain falls back to
// the default store, mirroring getStoreFromServer.
export async function resolveTrustedStoreId(
  request: NextRequest,
  supabase: any,
): Promise<string> {
  if (process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === "true") {
    const configuredStoreId = process.env.DEFAULT_STORE_ID || "default";
    return configuredStoreId === "default"
      ? resolveDefaultStoreId(supabase)
      : configuredStoreId;
  }

  const subdomain = resolveStoreLookupSubdomain(request.headers.get("host"));
  const storeId = await resolveStoreIdBySubdomain(supabase, subdomain);

  return storeId ?? resolveDefaultStoreId(supabase);
}
