import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { normalizeHomeDiscountPopupConfig } from "@/lib/home-discount-popup";

type EcommerceClient = ReturnType<typeof createServerClient>;

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

async function requireAdminServer(authClient: EcommerceClient, ecommerceClient: EcommerceClient) {
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return { error: "Debes iniciar sesión como administrador", status: 401 as const };
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

async function getStoreRecord() {
  const clients = await getSupabaseServerClients();
  if (!clients) {
    return { error: "Supabase no configurado", status: 500 as const };
  }

  const adminCheck = await requireAdminServer(
    clients.authClient,
    clients.ecommerceClient,
  );
  if ("error" in adminCheck) {
    return adminCheck;
  }

  const storeId = await getStoreIdFromServer();
  let query = clients.ecommerceClient
    .from("stores")
    .select("id, metadata")
    .eq("is_active", true)
    .is("deleted_at", null);

  query =
    storeId === "default"
      ? query.eq("subdomain", "default")
      : query.eq("id", storeId);

  const { data, error } = await query.single();
  if (error || !data) {
    return { error: "Tienda no encontrada", status: 404 as const };
  }

  return { clients, data };
}

export async function GET() {
  try {
    const storeRecord = await getStoreRecord();
    if ("error" in storeRecord) {
      return NextResponse.json(
        { error: storeRecord.error },
        { status: storeRecord.status },
      );
    }

    const metadata =
      (storeRecord.data.metadata as Record<string, unknown> | null) || {};
    return NextResponse.json({
      config: normalizeHomeDiscountPopupConfig(metadata.homeDiscountPopup),
    });
  } catch (error) {
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
    const body = await request.json();
    const config = normalizeHomeDiscountPopupConfig(body?.config);

    const storeRecord = await getStoreRecord();
    if ("error" in storeRecord) {
      return NextResponse.json(
        { error: storeRecord.error },
        { status: storeRecord.status },
      );
    }

    const metadata =
      (storeRecord.data.metadata as Record<string, unknown> | null) || {};

    const nextMetadata = {
      ...metadata,
      homeDiscountPopup: config,
    };

    const { error } = await storeRecord.clients.ecommerceClient
      .from("stores")
      .update({ metadata: nextMetadata, updated_at: new Date().toISOString() })
      .eq("id", storeRecord.data.id);

    if (error) {
      console.error(
        "[Home Discount Popup API] Error al guardar configuración:",
        error,
      );
      return NextResponse.json(
        { error: "Error al guardar configuración" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
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
