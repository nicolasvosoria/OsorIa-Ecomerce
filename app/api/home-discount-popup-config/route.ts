import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import {
  normalizeHomeDiscountPopupConfig,
  type HomeDiscountPopupConfig,
} from "@/lib/home-discount-popup";

type EcommerceClient = ReturnType<typeof createServerClient>;

type PopupQuery = {
  select: (columns: string) => PopupQuery;
  eq: (column: string, value: unknown) => PopupQuery;
  is: (column: string, value: null) => PopupQuery;
  maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
  single: () => Promise<{ data: unknown; error: unknown }>;
  upsert: (
    values: Record<string, unknown>,
    options?: Record<string, unknown>,
  ) => Promise<{ error: unknown }>;
};

type PopupPersistenceClient = {
  from: (table: string) => PopupQuery;
};

async function getSupabaseServerClients() {
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
    ecommerceClient: client.schema("ecommerce") as EcommerceClient,
  };
}

async function getStoreIdFromServer(): Promise<string> {
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

async function requireAdminServer(
  authClient: EcommerceClient,
  ecommerceClient: EcommerceClient,
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
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || profile?.role !== "admin") {
    return { error: "Acceso denegado", status: 403 as const };
  }

  return { user };
}

async function resolveStoreId(
  ecommerceClient: PopupPersistenceClient,
  storeLookup: string,
): Promise<string> {
  let query = ecommerceClient
    .from("stores")
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

export async function loadHomeDiscountPopupConfig(
  ecommerceClient: PopupPersistenceClient,
  storeLookup: string,
): Promise<{ storeId: string; config: HomeDiscountPopupConfig }> {
  const storeId = await resolveStoreId(ecommerceClient, storeLookup);
  const { data, error } = await ecommerceClient
    .from("store_integrations")
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
  ecommerceClient: PopupPersistenceClient,
  storeLookup: string,
  input: unknown,
): Promise<{ storeId: string; config: HomeDiscountPopupConfig }> {
  const storeId = await resolveStoreId(ecommerceClient, storeLookup);
  const config = normalizeHomeDiscountPopupConfig(input);
  const { data, error: readError } = await ecommerceClient
    .from("store_integrations")
    .select("metadata")
    .eq("store_id", storeId)
    .maybeSingle();

  if (readError) {
    throw readError;
  }

  const metadata =
    asMetadataRecord((data as { metadata?: unknown } | null)?.metadata) || {};

  const { error: writeError } = await ecommerceClient
    .from("store_integrations")
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

async function getAuthorizedClients(): Promise<
  | {
      clients: Awaited<ReturnType<typeof getSupabaseServerClients>>;
    }
  | { error: string; status: 401 | 403 | 500 }
> {
  const clients = await getSupabaseServerClients();
  if (!clients) {
    return { error: "Supabase no configurado", status: 500 as const };
  }

  const adminCheck = await requireAdminServer(
    clients.authClient,
    clients.ecommerceClient,
  );
  if ("error" in adminCheck) {
    return {
      error: adminCheck.error as string,
      status: adminCheck.status as 401 | 403,
    };
  }

  return { clients: clients! };
}

function asNotFoundResponse(error: unknown) {
  if (error instanceof Error && error.message === "Tienda no encontrada") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return null;
}

export async function GET() {
  try {
    const authorized = await getAuthorizedClients();
    if (!("clients" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const { config } = await loadHomeDiscountPopupConfig(
      authorized.clients!.ecommerceClient as unknown as PopupPersistenceClient,
      await getStoreIdFromServer(),
    );

    return NextResponse.json({ config });
  } catch (error) {
    const notFoundResponse = asNotFoundResponse(error);
    if (notFoundResponse) {
      return notFoundResponse;
    }

    console.error(
      "[Home Discount Popup API] Error al obtener configuración:",
      error,
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorized = await getAuthorizedClients();
    if (!("clients" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const body = await request.json();
    const { config } = await saveHomeDiscountPopupConfig(
      authorized.clients!.ecommerceClient as unknown as PopupPersistenceClient,
      await getStoreIdFromServer(),
      body?.config,
    );

    return NextResponse.json({ success: true, config });
  } catch (error) {
    const notFoundResponse = asNotFoundResponse(error);
    if (notFoundResponse) {
      return notFoundResponse;
    }

    console.error(
      "[Home Discount Popup API] Error al guardar configuración:",
      error,
    );
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
