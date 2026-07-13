import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES } from "@/lib/supabase/contract";

type SupabaseServerClient = ReturnType<typeof createServerClient>;

type StoreIdQuery = {
  select: (columns: string) => StoreIdQuery;
  eq: (column: string, value: unknown) => StoreIdQuery;
  is: (column: string, value: null) => StoreIdQuery;
  single: () => Promise<{ data: unknown; error: unknown }>;
  maybeSingle: () => Promise<{ data: any; error: unknown }>;
};

type StoreLookupClient = {
  from: (table: string) => StoreIdQuery;
};

export function getHomeDiscountPopupServiceClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    serviceClient: client,
    ecommerceClient: client.schema(ECOMMERCE_SCHEMA) as SupabaseServerClient,
  };
}

export async function resolveHomeDiscountPopupStoreId(
  ecommerceClient: StoreLookupClient,
  storeLookup: string,
): Promise<string> {
  let query = ecommerceClient
    .from(ECOMMERCE_TABLES.stores)
    .select("id")
    .eq("is_active", true)
    .is("deleted_at", null);

  query =
    storeLookup === "default"
      ? query.eq("subdomain", "default")
      : query.eq("id", storeLookup);

  const { data, error } = await query.single();
  if (error || !data) {
    throw new Error("Tienda no encontrada");
  }

  return String((data as { id?: unknown }).id ?? "");
}

export function asMetadataRecord(
  value: unknown,
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
