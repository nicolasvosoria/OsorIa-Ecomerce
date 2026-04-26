import { NextRequest, NextResponse } from "next/server";

import {
  normalizeHomeDiscountPopupConfig,
  type HomeDiscountPopupConfig,
} from "@/lib/home-discount-popup";
import {
  asMetadataRecord,
  getHomeDiscountPopupServiceClients,
  getHomeDiscountPopupStoreLookup,
  resolveHomeDiscountPopupStoreId,
} from "@/lib/home-discount-popup-admin";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";

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

async function resolveStoreId(
  ecommerceClient: PopupPersistenceClient,
  storeLookup: string,
): Promise<string> {
  return resolveHomeDiscountPopupStoreId(ecommerceClient, storeLookup);
}

export async function loadHomeDiscountPopupConfig(
  ecommerceClient: PopupPersistenceClient,
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
  ecommerceClient: PopupPersistenceClient,
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

async function getAuthorizedClient(
  request: NextRequest,
): Promise<
  | { ecommerceClient: PopupPersistenceClient }
  | { error: string; status: 401 | 403 | 500 }
> {
  const clients = getHomeDiscountPopupServiceClients();
  if (!clients) {
    return { error: "Supabase no configurado", status: 500 as const };
  }

  const adminCheck = await requireAdminUser(
    request,
    clients.ecommerceClient as unknown as PopupPersistenceClient,
  );
  if ("error" in adminCheck) {
    return {
      error: adminCheck.error as string,
      status: adminCheck.status as 401 | 403,
    };
  }

  return {
    ecommerceClient:
      clients.ecommerceClient as unknown as PopupPersistenceClient,
  };
}

function asNotFoundResponse(error: unknown) {
  if (error instanceof Error && error.message === "Tienda no encontrada") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authorized = await getAuthorizedClient(request);
    if (!("ecommerceClient" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const { config } = await loadHomeDiscountPopupConfig(
      authorized.ecommerceClient,
      await getHomeDiscountPopupStoreLookup(),
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
    const authorized = await getAuthorizedClient(request);
    if (!("ecommerceClient" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const body = await request.json();
    const { config } = await saveHomeDiscountPopupConfig(
      authorized.ecommerceClient,
      await getHomeDiscountPopupStoreLookup(),
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
