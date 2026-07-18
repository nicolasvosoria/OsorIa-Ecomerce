import { NextRequest, NextResponse } from "next/server";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import {
  adminErrorResponse,
  authorizeStoreAdmin,
} from "@/lib/supabase/admin-route-guard";
import { resolveShopConfig } from "@/lib/shop/shop-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (typeof body?.config !== "object" || body.config === null || Array.isArray(body.config)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const config = resolveShopConfig(body.config);

    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);
    const { supabase, storeId } = auth;

    const timestamp = new Date().toISOString();
    const { data: existing, error: checkError } = await supabase
      .from(ECOMMERCE_TABLES.shopConfig)
      .select("id")
      .eq("store_id", storeId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    const table = supabase.from(ECOMMERCE_TABLES.shopConfig);
    const result = existing
      ? await table
          .update({
            config,
            updated_at: timestamp,
          })
          .eq("store_id", storeId)
          .select()
          .single()
      : await table
          .insert({
            store_id: storeId,
            config,
            updated_at: timestamp,
          })
          .select()
          .single();

    if (result.error || !result.data) {
      throw result.error ?? new Error("No data returned");
    }

    return NextResponse.json({ data: result.data.config });
  } catch (error) {
    console.error("[Shop Config API] Error:", error);
    return NextResponse.json(
      { error: "Error al guardar la configuración de la tienda" },
      { status: 500 },
    );
  }
}
