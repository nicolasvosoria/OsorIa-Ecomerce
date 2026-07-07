import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ECOMMERCE_SCHEMA, ECOMMERCE_VIEWS } from "./contract";

export function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema(ECOMMERCE_SCHEMA) as any;
}

async function getRuntimeStoreId() {
  const disableMultiTenant =
    process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === "true";
  if (disableMultiTenant) {
    return process.env.DEFAULT_STORE_ID || "default";
  }

  const cookieStore = await cookies();
  return cookieStore.get("store_id")?.value ?? null;
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

export async function resolveTargetStoreId(supabase: any) {
  const storeId = await getRuntimeStoreId();
  if (storeId && storeId !== "default") {
    return storeId;
  }

  return resolveDefaultStoreId(supabase);
}
