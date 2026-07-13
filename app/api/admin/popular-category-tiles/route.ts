import { NextRequest, NextResponse } from "next/server";
import {
  adminErrorResponse,
  authorizeStoreAdmin,
} from "@/lib/supabase/admin-route-guard";
import { getPopularCategoryTiles } from "@/lib/products/popular-sections";
import { resolveCategoryTilesOverride } from "@/lib/sections/popular-variant";

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
    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);

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
