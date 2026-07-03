import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema(ECOMMERCE_SCHEMA) as any;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pairingName =
      typeof body?.pairingName === "string" ? body.pairingName.trim() : "";

    if (!pairingName) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

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

    const { data: targetPairing, error: targetPairingError } = await supabase
      .from(ECOMMERCE_TABLES.appFontPairings)
      .select("id")
      .eq("pairing_name", pairingName)
      .maybeSingle();

    if (targetPairingError) {
      throw targetPairingError;
    }

    if (!targetPairing?.id) {
      return NextResponse.json(
        { error: "Combinación de fuentes no encontrada" },
        { status: 404 },
      );
    }

    const { error: deactivateError } = await supabase
      .from(ECOMMERCE_TABLES.appFontPairings)
      .update({ is_active: false })
      .neq("is_active", false);

    if (deactivateError) {
      throw deactivateError;
    }

    const { error: activateError } = await supabase
      .from(ECOMMERCE_TABLES.appFontPairings)
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("pairing_name", pairingName);

    if (activateError) {
      throw activateError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Font Pairing Activation API] Error:", error);
    return NextResponse.json(
      { error: "Error al activar combinación de fuentes" },
      { status: 500 },
    );
  }
}
