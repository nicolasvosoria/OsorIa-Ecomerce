import { NextRequest, NextResponse } from "next/server";

import {
  getHomeDiscountPopupServiceClients,
  loadHomeDiscountPopupConfig,
  saveHomeDiscountPopupConfig,
  type HomeDiscountPopupPersistenceClient,
} from "@/lib/home-discount-popup-admin";
import { authorizeStoreAdmin } from "@/lib/supabase/admin-route-guard";

async function getAuthorizedContext(
  request: NextRequest,
): Promise<
  | { ecommerceClient: HomeDiscountPopupPersistenceClient; storeId: string }
  | { error: string; status: 401 | 403 | 500 }
> {
  const clients = getHomeDiscountPopupServiceClients();
  if (!clients) {
    return { error: "Supabase no configurado", status: 500 as const };
  }

  const ecommerceClient =
    clients.ecommerceClient as unknown as HomeDiscountPopupPersistenceClient;
  const auth = await authorizeStoreAdmin(request, ecommerceClient);
  if ("error" in auth) {
    return { error: auth.error, status: auth.status };
  }

  return { ecommerceClient, storeId: auth.storeId };
}

function asNotFoundResponse(error: unknown) {
  if (error instanceof Error && error.message === "Tienda no encontrada") {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const authorized = await getAuthorizedContext(request);
    if (!("ecommerceClient" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const { config } = await loadHomeDiscountPopupConfig(
      authorized.ecommerceClient,
      authorized.storeId,
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
    const authorized = await getAuthorizedContext(request);
    if (!("ecommerceClient" in authorized)) {
      return NextResponse.json(
        { error: authorized.error },
        { status: authorized.status },
      );
    }

    const body = await request.json();
    const { config } = await saveHomeDiscountPopupConfig(
      authorized.ecommerceClient,
      authorized.storeId,
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
