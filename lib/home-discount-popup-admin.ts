import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
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

export async function getHomeDiscountPopupServerClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const cookieStore = await cookies();

  const client = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {}
      },
    },
  });

  return {
    authClient: client,
    ecommerceClient: client.schema(ECOMMERCE_SCHEMA) as SupabaseServerClient,
  };
}

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

export async function getHomeDiscountPopupStoreLookup(): Promise<string> {
  if (process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === "true") {
    return process.env.DEFAULT_STORE_ID || "default";
  }

  try {
    const cookieStore = await cookies();
    return cookieStore.get("store_id")?.value || "default";
  } catch {
    return "default";
  }
}

export async function requireHomeDiscountPopupAdmin(
  authClient: SupabaseServerClient,
  ecommerceClient: SupabaseServerClient,
) {
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return {
      error: "Debes iniciar sesión como administrador",
      status: 401 as const,
    };
  }

  const { data: profile, error: profileError } = await ecommerceClient
    .from(ECOMMERCE_TABLES.userProfiles)
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { error: "Acceso denegado", status: 403 as const };
  }

  return { user };
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
