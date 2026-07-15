import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeHomeDiscountPopupConfig,
  type HomeDiscountPopupConfig,
} from "@/lib/home-discount-popup";
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES } from "@/lib/supabase/contract";

type SupabaseServerClient = ReturnType<typeof createServerClient>;

type PopupQuery = {
  select: (columns: string) => PopupQuery;
  eq: (column: string, value: unknown) => PopupQuery;
  is: (column: string, value: null) => PopupQuery;
  single: () => Promise<{ data: unknown; error: unknown }>;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  upsert: (
    values: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<{ error: unknown }>;
};

export type HomeDiscountPopupPersistenceClient = {
  from: (table: string) => PopupQuery;
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

export async function loadHomeDiscountPopupConfig(
  ecommerceClient: HomeDiscountPopupPersistenceClient,
  storeLookup: string,
): Promise<{ storeId: string; config: HomeDiscountPopupConfig }> {
  const storeId = await resolveStoreId(ecommerceClient, storeLookup);
  const { data, error } = await ecommerceClient
    .from(ECOMMERCE_TABLES.storeIntegrations)
    .select("metadata")
    .eq("store_id", storeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const metadata = asMetadataRecord(
    (data as { metadata?: unknown } | null)?.metadata,
  );

  return {
    storeId,
    config: normalizeHomeDiscountPopupConfig(metadata?.homeDiscountPopup),
  };
}

export async function saveHomeDiscountPopupConfig(
  ecommerceClient: HomeDiscountPopupPersistenceClient,
  storeLookup: string,
  input: unknown,
): Promise<{ storeId: string; config: HomeDiscountPopupConfig }> {
  const storeId = await resolveStoreId(ecommerceClient, storeLookup);
  const config = normalizeHomeDiscountPopupConfig(input);
  const { data, error: readError } = await ecommerceClient
    .from(ECOMMERCE_TABLES.storeIntegrations)
    .select("metadata")
    .eq("store_id", storeId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const metadata =
    asMetadataRecord((data as { metadata?: unknown } | null)?.metadata) || {};

  const { error: writeError } = await ecommerceClient
    .from(ECOMMERCE_TABLES.storeIntegrations)
    .upsert(
      {
        store_id: storeId,
        metadata: {
          ...metadata,
          homeDiscountPopup: config,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    );

  if (writeError) {
    throw writeError;
  }

  return { storeId, config };
}

async function resolveStoreId(
  ecommerceClient: HomeDiscountPopupPersistenceClient,
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

function asMetadataRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
