import { NextRequest, NextResponse } from "next/server";
import {
  adminErrorResponse,
  authorizeStoreAdmin,
} from "@/lib/supabase/admin-route-guard";
import {
  getOrders,
  updateOrderStatus,
  type GetOrdersParams,
  type Order,
} from "@/lib/supabase/orders-api";

const ORDER_STATUSES: Order["status"][] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
];

function parseListParams(searchParams: URLSearchParams): GetOrdersParams {
  const params: GetOrdersParams = {};

  const limit = Number(searchParams.get("limit"));
  if (Number.isFinite(limit) && limit > 0) params.limit = limit;

  const offset = Number(searchParams.get("offset"));
  if (Number.isFinite(offset) && offset >= 0) params.offset = offset;

  const orderBy = searchParams.get("order_by");
  if (orderBy === "created_at" || orderBy === "order_date" || orderBy === "total_amount") {
    params.order_by = orderBy;
  }

  const orderDirection = searchParams.get("order_direction");
  if (orderDirection === "asc" || orderDirection === "desc") {
    params.order_direction = orderDirection;
  }

  const status = searchParams.get("status");
  if (status && ORDER_STATUSES.includes(status as Order["status"])) {
    params.status = status as Order["status"];
  }

  return params;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);
    const { supabase, storeId } = auth;

    const params = parseListParams(request.nextUrl.searchParams);
    const result = await getOrders({ ...params, storeId }, supabase);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Admin Orders API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener los pedidos" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const orderId = typeof body?.orderId === "string" ? body.orderId : null;
    const status = body?.status as Order["status"] | undefined;

    if (!orderId || !status || !ORDER_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);
    const { supabase, storeId } = auth;

    const updated = await updateOrderStatus(orderId, status, storeId, supabase);
    if (!updated) {
      return NextResponse.json(
        { error: "No se pudo actualizar el estado del pedido" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Admin Orders API] Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar el estado del pedido" },
      { status: 500 },
    );
  }
}
