import { NextRequest, NextResponse } from "next/server";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";
import {
  adminErrorResponse,
  authorizeStoreAdmin,
} from "@/lib/supabase/admin-route-guard";
import {
  normalizeThemeDefinition,
  normalizeThemeRecord,
} from "@/lib/theme-font/runtime-contract";
import { resolveThemeDefinition } from "@/lib/theme-font/theme-presets";
import { stripSectionStyleKeys } from "@/lib/theme/section-style-keys";
import type { ThemeColors } from "@/lib/types/theme";

async function readConfirmedActiveTheme(supabase: any, storeId: string) {
  const { data: version, error: versionError } = await supabase
    .from(ECOMMERCE_TABLES.appThemeVersions)
    .select("id, store_id, theme_id, created_at")
    .eq("store_id", storeId)
    .eq("is_current", true)
    .maybeSingle();

  if (versionError || !version?.theme_id) return null;

  const { data: activeTheme, error: activeThemeError } = await supabase
    .from(ECOMMERCE_TABLES.appThemes)
    .select("*")
    .eq("id", version.theme_id)
    .maybeSingle();

  if (activeThemeError || !activeTheme) return null;

  return normalizeThemeRecord({
    ...activeTheme,
    store_id: version.store_id ?? storeId,
    theme_version_id: version.id,
    theme_published_at: version.created_at,
  });
}

// Reactivates a version that already exists in history: flips `is_current`
// onto that row only (never inserts a new one, never touches
// `component_styles`). D3/Option A — a revert restores the theme's stored
// tokens only.
async function revertThemeVersion(
  supabase: any,
  storeId: string,
  versionId: string,
) {
  const { data: version, error: versionError } = await supabase
    .from(ECOMMERCE_TABLES.appThemeVersions)
    .select("id")
    .eq("id", versionId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (versionError || !version?.id) {
    return NextResponse.json(
      { error: "Versión no encontrada" },
      { status: 404 },
    );
  }

  const { error: deactivateError } = await supabase
    .from(ECOMMERCE_TABLES.appThemeVersions)
    .update({ is_current: false })
    .eq("store_id", storeId);
  if (deactivateError) {
    throw deactivateError;
  }

  const { error: activateError } = await supabase
    .from(ECOMMERCE_TABLES.appThemeVersions)
    .update({ is_current: true })
    .eq("id", versionId);
  if (activateError) {
    throw activateError;
  }

  return NextResponse.json({
    success: true,
    activeTheme: await readConfirmedActiveTheme(supabase, storeId),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const versionId =
      typeof body?.versionId === "string" ? body.versionId.trim() : "";
    const themeName =
      typeof body?.themeName === "string" ? body.themeName.trim() : "";
    const baseThemeName =
      typeof body?.baseThemeName === "string" ? body.baseThemeName.trim() : "";
    const isCustomRequest = body?.definition !== undefined;
    const customDefinition = isCustomRequest
      ? normalizeThemeDefinition(body.definition)
      : null;

    if (!versionId) {
      if (isCustomRequest && (!customDefinition || !baseThemeName)) {
        return NextResponse.json(
          { error: "Payload inválido" },
          { status: 400 },
        );
      }
      if (!isCustomRequest && !themeName) {
        return NextResponse.json(
          { error: "Payload inválido" },
          { status: 400 },
        );
      }
    }

    const auth = await authorizeStoreAdmin(request);
    if ("error" in auth) return adminErrorResponse(auth);
    const { supabase, storeId } = auth;

    if (versionId) {
      return await revertThemeVersion(supabase, storeId, versionId);
    }

    const lookupThemeName = isCustomRequest ? baseThemeName : themeName;

    const { data: theme, error: themeError } = await supabase
      .from(ECOMMERCE_TABLES.appThemes)
      .select("*")
      .eq("theme_name", lookupThemeName)
      .single();
    if (themeError || !theme?.id) {
      return NextResponse.json(
        { error: "Tema no encontrado" },
        { status: 404 },
      );
    }

    const { error: deactivateError } = await supabase
      .from(ECOMMERCE_TABLES.appThemeVersions)
      .update({ is_current: false })
      .eq("store_id", storeId);
    if (deactivateError) {
      throw deactivateError;
    }

    // Persist the resolved (preset path) or edited (custom path) two-axis
    // bundle alongside the `is_current` flip so `getActiveTheme` can read it
    // back verbatim next time (Slice 4 storage). `theme.colors` is the same
    // jsonb the route already selected above.
    const definition =
      customDefinition ??
      resolveThemeDefinition(themeName, theme.colors as ThemeColors);
    const storedFonts = { fontPairingId: definition.fontPairingId ?? null };

    // Applying a theme resets only the STYLE fields of each section
    // (`SECTION_STYLE_KEYS`), keeping all CONTENT intact, but only after a
    // reversible backup has been taken. The backup is nested under
    // `variables.backup_component_styles` (an unknown key to
    // `normalizeThemeRecord`, which only ever lifts the known definition keys
    // above, so it is safely ignored at read time).
    // Backup-before-modify, store-scoped only: if the read fails for any
    // reason, skip the reset entirely and leave existing customizations
    // intact (fail safe).
    let backupComponentStyles: {
      snapshot: unknown[];
      backedUpAt: string;
      source: string;
    } | null = null;

    try {
      const { data: componentStyleRows, error: componentStylesReadError } =
        await supabase
          .from(ECOMMERCE_TABLES.componentStyles)
          .select("*")
          .eq("store_id", storeId);

      if (componentStylesReadError) {
        throw componentStylesReadError;
      }

      backupComponentStyles = {
        snapshot: componentStyleRows ?? [],
        backedUpAt: new Date().toISOString(),
        source: "theme-activation-reset",
      };
    } catch (backupError) {
      console.error(
        "[Theme Activation API] Failed to back up component styles, skipping reset:",
        backupError,
      );
    }

    const storedVariables = backupComponentStyles
      ? { ...definition, backup_component_styles: backupComponentStyles }
      : definition;

    const activatedVersionId = crypto.randomUUID();
    const { error: insertError } = await supabase
      .from(ECOMMERCE_TABLES.appThemeVersions)
      .insert({
        id: activatedVersionId,
        store_id: storeId,
        theme_id: theme.id,
        is_current: true,
        variables: storedVariables,
        fonts: storedFonts,
        is_custom: isCustomRequest,
      });

    if (insertError) {
      throw insertError;
    }

    // Only reset per-section styles once the backup above is confirmed safe.
    // Each row is updated (never deleted) so its content survives; only rows
    // whose section has registered style keys, and whose variables actually
    // change, get written. Every update stays store-scoped: never a global
    // wipe.
    if (backupComponentStyles) {
      const componentStyleRows = backupComponentStyles.snapshot as Array<{
        id: string | number;
        component_name: string;
        variables: Record<string, unknown> | null;
      }>;

      for (const row of componentStyleRows) {
        const currentVariables = row.variables ?? {};
        const strippedVariables = stripSectionStyleKeys(
          row.component_name,
          currentVariables,
        );

        if (strippedVariables === currentVariables) continue;

        const { error: resetError } = await supabase
          .from(ECOMMERCE_TABLES.componentStyles)
          .update({ variables: strippedVariables })
          .eq("store_id", storeId)
          .eq("id", row.id);

        if (resetError) {
          console.error(
            "[Theme Activation API] Failed to reset style for component:",
            row.component_name,
            resetError,
          );
        }
      }
    }

    const activeTheme =
      (await readConfirmedActiveTheme(supabase, storeId)) ??
      normalizeThemeRecord({
        ...theme,
        store_id: storeId,
        theme_version_id: activatedVersionId,
      });

    return NextResponse.json(
      activeTheme ? { success: true, activeTheme } : { success: true },
    );
  } catch (error) {
    console.error("[Theme Activation API] Error:", error);
    return NextResponse.json(
      { error: "Error al activar tema" },
      { status: 500 },
    );
  }
}
