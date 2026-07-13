import { NextRequest, NextResponse } from "next/server";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import {
  adminErrorResponse,
  authorizeStoreAdmin,
} from "@/lib/supabase/admin-route-guard";

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
    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);
    const { supabase, storeId } = auth;

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
