import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ECOMMERCE_SCHEMA } from "@/lib/supabase/contract";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";
import { getPopularCategoryTiles } from "@/lib/products/popular-sections";
import { resolveCategoryTilesOverride } from "@/lib/sections/popular-variant";

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema(ECOMMERCE_SCHEMA) as any;
}

function parseCategoryTiles(value: string | null): unknown {
  if (!value) return [];

  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

/**
 * GET /api/admin/popular-category-tiles?categoryTiles=<JSON-encoded array>
 *
 * Permite que el preview del editor de admin pida las tiles de categoría
 * curadas por un edit efímero (sin publicar) — `getPopularCategoryTiles` usa
 * datos de catálogo que pueden estar restringidos por RLS para el cliente
 * anónimo, así que esto corre bajo una sesión de admin autenticada, igual que
 * `/api/admin/popular-products`.
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
    const rawCategoryTiles = parseCategoryTiles(searchParams.get("categoryTiles"));
    const categoryTiles = resolveCategoryTilesOverride(rawCategoryTiles);

    const tiles = await getPopularCategoryTiles(undefined, categoryTiles);

    return NextResponse.json({ tiles });
  } catch (error) {
    console.error("[Popular Category Tiles API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener las categorías" },
      { status: 500 },
    );
  }
}
