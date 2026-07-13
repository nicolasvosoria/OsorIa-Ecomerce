import { NextRequest, NextResponse } from "next/server";
import {
  adminErrorResponse,
  authorizeStoreAdmin,
} from "@/lib/supabase/admin-route-guard";
import { getPopularProductCards, type PopularSelectionMode } from "@/lib/products/popular-sections";

const SELECTION_MODES: PopularSelectionMode[] = [
  "display_order",
  "best_selling",
  "most_viewed",
  "featured",
];
const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 12;

function parseMode(value: string | null): PopularSelectionMode {
  return (SELECTION_MODES as string[]).includes(value ?? "")
    ? (value as PopularSelectionMode)
    : "display_order";
}

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

/**
 * GET /api/admin/popular-products?mode=best_selling&limit=4
 *
 * Permite que el preview del editor de admin pida modos de selección (como
 * "best_selling") que leen datos de pedidos potencialmente restringidos por
 * RLS para el cliente anónimo, bajo una sesión de admin autenticada.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);

    const { searchParams } = request.nextUrl;
    const mode = parseMode(searchParams.get("mode"));
    const limit = parseLimit(searchParams.get("limit"));

    const products = await getPopularProductCards(limit, mode);

    return NextResponse.json({ products });
  } catch (error) {
    console.error("[Popular Products API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener productos" },
      { status: 500 },
    );
  }
}
