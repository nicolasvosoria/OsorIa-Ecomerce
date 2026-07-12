import { NextRequest, NextResponse } from "next/server";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";
import {
  getSupabaseServiceClient,
  resolveTargetStoreId,
} from "@/lib/supabase/admin-store";
import { resolveHomeComposition } from "@/lib/sections/home-composition";

function adminErrorResponse(
  adminCheck: Extract<
    Awaited<ReturnType<typeof requireAdminUser>>,
    { error: string }
  >,
) {
  const responseBody = adminCheck.diagnostics
    ? { error: adminCheck.error, diagnostics: adminCheck.diagnostics }
    : { error: adminCheck.error };

  return NextResponse.json(responseBody, { status: adminCheck.status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!Array.isArray(body?.sections)) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const sections = resolveHomeComposition(body.sections);

    const supabase = getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 },
      );
    }

    const adminCheck = await requireAdminUser(request, supabase);
    if ("error" in adminCheck) return adminErrorResponse(adminCheck);

    const storeId = await resolveTargetStoreId(supabase);
    const timestamp = new Date().toISOString();
    const { data: existing, error: checkError } = await supabase
      .from(ECOMMERCE_TABLES.homeSectionLayout)
      .select("id")
      .eq("store_id", storeId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    const table = supabase.from(ECOMMERCE_TABLES.homeSectionLayout);
    const result = existing
      ? await table
          .update({
            sections,
            updated_at: timestamp,
          })
          .eq("store_id", storeId)
          .select()
          .single()
      : await table
          .insert({
            store_id: storeId,
            sections,
            updated_at: timestamp,
          })
          .select()
          .single();

    if (result.error || !result.data) {
      throw result.error ?? new Error("No data returned");
    }

    return NextResponse.json({ data: result.data.sections });
  } catch (error) {
    console.error("[Home Composition API] Error:", error);
    return NextResponse.json(
      { error: "Error al guardar la composición de inicio" },
      { status: 500 },
    );
  }
}
