import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ECOMMERCE_SCHEMA } from "@/lib/supabase/contract";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";
import { getPopularProductCards, type PopularSelectionMode } from "@/lib/products/popular-sections";

const SELECTION_MODES: PopularSelectionMode[] = [
  "display_order",
  "best_selling",
  "most_viewed",
  "featured",
];
const DEFAULT_LIMIT = 4;
const MAX_LIMIT = 12;

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema(ECOMMERCE_SCHEMA) as any;
}

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
    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 },
      );
    }

    const adminCheck = await requireAdminUser(request, supabase);
    if ("error" in adminCheck) {
      const responseBody = adminCheck.diagnostics
        ? { error: adminCheck.error, diagnostics: adminCheck.diagnostics }
        : { error: adminCheck.error };

      return NextResponse.json(responseBody, { status: adminCheck.status });
    }

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
