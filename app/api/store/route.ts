import { NextRequest, NextResponse } from "next/server";
import { getSupabaseEcommerce } from "@/lib/supabase/client";
import {
  parseStoreLookupParams,
  PUBLIC_STORE_SELECT,
  toPublicStorePayload,
} from "@/lib/security/store-contract";

/**
 * API Route para obtener información de una tienda
 * GET /api/store?subdomain=electronica
 * GET /api/store?id=uuid
 */
export async function GET(request: NextRequest) {
  try {
    const lookup = parseStoreLookupParams(request.nextUrl.searchParams);

    if (lookup.kind === "invalid") {
      return NextResponse.json(
        { error: lookup.error },
        { status: lookup.status },
      );
    }

    const supabase = getSupabaseEcommerce();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 },
      );
    }

    let store = null;

    if (lookup.kind === "subdomain") {
      const { data, error } = await supabase
        .from("stores_legacy")
        .select(PUBLIC_STORE_SELECT)
        .eq("subdomain", lookup.value)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        console.error(
          "[Store API] Error al obtener tienda por subdominio:",
          error,
        );
        return NextResponse.json(
          { error: "Error al obtener tienda" },
          { status: 500 },
        );
      }
      store = data;
    } else {
      const { data, error } = await supabase
        .from("stores_legacy")
        .select(PUBLIC_STORE_SELECT)
        .eq("id", lookup.value)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();

      if (error) {
        console.error("[Store API] Error al obtener tienda por ID:", error);
        return NextResponse.json(
          { error: "Error al obtener tienda" },
          { status: 500 },
        );
      }
      store = data;
    }

    if (!store) {
      return NextResponse.json(
        { error: "Tienda no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json(toPublicStorePayload(store));
  } catch (error) {
    console.error("[Store API] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
