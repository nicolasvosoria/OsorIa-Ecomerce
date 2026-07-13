import { NextRequest, NextResponse } from "next/server";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import { requireSuperAdmin } from "@/lib/supabase/admin-route-auth";
import { adminErrorResponse } from "@/lib/supabase/admin-route-guard";
import { getSupabaseServiceClient } from "@/lib/supabase/admin-store";

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

    const adminCheck = await requireSuperAdmin(request, supabase);
    if ("error" in adminCheck) return adminErrorResponse(adminCheck);

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
