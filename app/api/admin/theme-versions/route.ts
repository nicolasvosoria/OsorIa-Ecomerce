import { NextRequest, NextResponse } from "next/server";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";
import {
  getSupabaseServiceClient,
  resolveTargetStoreId,
} from "@/lib/supabase/admin-store";

// Newest-first history for this store, labeled with its base theme's name.
// `variables`/`fonts` stay server-side: only the summary fields the history
// panel renders are returned.
async function listThemeVersions(supabase: any, storeId: string) {
  const { data: versions, error: versionsError } = await supabase
    .from(ECOMMERCE_TABLES.appThemeVersions)
    .select("id, theme_id, is_current, is_custom, created_at")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  if (versionsError) {
    throw versionsError;
  }
  if (!versions?.length) {
    return [];
  }

  const themeIds = [
    ...new Set(versions.map((version: any) => version.theme_id)),
  ];
  const { data: themes, error: themesError } = await supabase
    .from(ECOMMERCE_TABLES.appThemes)
    .select("id, theme_name")
    .in("id", themeIds);

  if (themesError) {
    throw themesError;
  }

  const themeNameById = new Map(
    (themes ?? []).map((theme: any) => [theme.id, theme.theme_name as string]),
  );

  return versions.map((version: any) => ({
    id: version.id,
    isCurrent: version.is_current,
    isCustom: version.is_custom,
    createdAt: version.created_at,
    baseThemeName: themeNameById.get(version.theme_id) ?? "Desconocido",
  }));
}

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

    const storeId = await resolveTargetStoreId(supabase);
    const versions = await listThemeVersions(supabase, storeId);

    return NextResponse.json({ versions });
  } catch (error) {
    console.error("[Theme Versions API] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial de temas" },
      { status: 500 },
    );
  }
}
