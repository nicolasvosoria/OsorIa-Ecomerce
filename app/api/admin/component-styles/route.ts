import { NextRequest, NextResponse } from "next/server";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import {
  adminErrorResponse,
  authorizeStoreAdmin,
} from "@/lib/supabase/admin-route-guard";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const componentName =
      typeof body?.componentName === "string" ? body.componentName.trim() : "";
    const variables = body?.variables;

    if (
      !componentName ||
      !variables ||
      typeof variables !== "object" ||
      Array.isArray(variables)
    ) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);
    const { supabase, storeId } = auth;

    const timestamp = new Date().toISOString();
    const { data: existing, error: checkError } = await supabase
      .from(ECOMMERCE_TABLES.componentStyles)
      .select("id")
      .eq("component_name", componentName)
      .eq("store_id", storeId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    const table = supabase.from(ECOMMERCE_TABLES.componentStyles);
    const result = existing
      ? await table
          .update({
            variables,
            updated_at: timestamp,
          })
          .eq("component_name", componentName)
          .eq("store_id", storeId)
          .select()
          .single()
      : await table
          .insert({
            component_name: componentName,
            store_id: storeId,
            variables,
            updated_at: timestamp,
          })
          .select()
          .single();

    if (result.error || !result.data) {
      throw result.error ?? new Error("No data returned");
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("[Component Styles API] Error:", error);
    return NextResponse.json(
      { error: "Error al guardar estilos del componente" },
      { status: 500 },
    );
  }
}
