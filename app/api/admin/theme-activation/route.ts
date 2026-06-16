import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  ECOMMERCE_SCHEMA,
  ECOMMERCE_TABLES,
  ECOMMERCE_VIEWS,
} from "@/lib/supabase/contract";
import { requireAdminUser } from "@/lib/supabase/admin-route-auth";
import { normalizeThemeRecord } from "@/lib/theme-font/runtime-contract";

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema(ECOMMERCE_SCHEMA) as any;
}

async function getRuntimeStoreId() {
  const disableMultiTenant =
    process.env.DISABLE_SUBDOMAIN_MULTI_TENANT === "true";
  if (disableMultiTenant) {
    return process.env.DEFAULT_STORE_ID || "default";
  }

  const cookieStore = await cookies();
  return cookieStore.get("store_id")?.value ?? null;
}

async function resolveDefaultStoreId(supabase: any) {
  const { data: defaultStore, error } = await supabase
    .from(ECOMMERCE_VIEWS.storesLegacy)
    .select("id")
    .eq("subdomain", "default")
    .single();

  if (error || !defaultStore?.id) {
    throw new Error("Default store not found");
  }

  return defaultStore.id as string;
}

async function resolveTargetStoreId(supabase: any) {
  const storeId = await getRuntimeStoreId();
  if (storeId && storeId !== "default") {
    return storeId;
  }

  return resolveDefaultStoreId(supabase);
}

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const themeName =
      typeof body?.themeName === "string" ? body.themeName.trim() : "";

    if (!themeName) {
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

    const storeId = await resolveTargetStoreId(supabase);

    const { data: theme, error: themeError } = await supabase
      .from(ECOMMERCE_TABLES.appThemes)
      .select("*")
      .eq("theme_name", themeName)
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

    const { data: existing, error: existingError } = await supabase
      .from(ECOMMERCE_TABLES.appThemeVersions)
      .select("id")
      .eq("store_id", storeId)
      .eq("theme_id", theme.id)
      .maybeSingle();
    if (existingError && existingError.code !== "PGRST116") {
      throw existingError;
    }

    let activatedVersionId = existing?.id as string | undefined;

    if (existing?.id) {
      const { error: activateError } = await supabase
        .from(ECOMMERCE_TABLES.appThemeVersions)
        .update({ is_current: true })
        .eq("id", existing.id);

      if (activateError) {
        throw activateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from(ECOMMERCE_TABLES.appThemeVersions)
        .insert({
          id: (activatedVersionId = crypto.randomUUID()),
          store_id: storeId,
          theme_id: theme.id,
          is_current: true,
        });

      if (insertError) {
        throw insertError;
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
