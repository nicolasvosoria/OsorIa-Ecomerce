import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {}
      },
      remove(name: string, options: any) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {}
      },
    },
  });
}

function getSupabaseServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey).schema("ecommerce") as any;
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
    .from("stores_legacy")
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

async function requireAdminUser(serviceSupabase: any) {
  const authSupabase = await getSupabaseAuthClient();
  if (!authSupabase) {
    return { error: "Supabase no configurado", status: 500 as const };
  }

  const {
    data: { user },
    error: authError,
  } = await authSupabase.auth.getUser();

  if (authError || !user) {
    return { error: "Acceso denegado", status: 401 as const };
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profile?.role !== "admin") {
    return { error: "Acceso denegado", status: 403 as const };
  }

  return { userId: user.id };
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

    const adminCheck = await requireAdminUser(supabase);
    if ("error" in adminCheck) {
      return NextResponse.json(
        { error: adminCheck.error },
        { status: adminCheck.status },
      );
    }

    const storeId = await resolveTargetStoreId(supabase);

    const { data: theme, error: themeError } = await supabase
      .from("app_themes")
      .select("id")
      .eq("theme_name", themeName)
      .single();
    if (themeError || !theme?.id) {
      return NextResponse.json(
        { error: "Tema no encontrado" },
        { status: 404 },
      );
    }

    const { error: deactivateError } = await supabase
      .from("app_theme_versions")
      .update({ is_current: false })
      .eq("store_id", storeId);
    if (deactivateError) {
      throw deactivateError;
    }

    const { data: existing, error: existingError } = await supabase
      .from("app_theme_versions")
      .select("id")
      .eq("store_id", storeId)
      .eq("theme_id", theme.id)
      .maybeSingle();
    if (existingError && existingError.code !== "PGRST116") {
      throw existingError;
    }

    if (existing?.id) {
      const { error: activateError } = await supabase
        .from("app_theme_versions")
        .update({ is_current: true })
        .eq("id", existing.id);

      if (activateError) {
        throw activateError;
      }
    } else {
      const { error: insertError } = await supabase
        .from("app_theme_versions")
        .insert({
          id: crypto.randomUUID(),
          store_id: storeId,
          theme_id: theme.id,
          is_current: true,
        });

      if (insertError) {
        throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Theme Activation API] Error:", error);
    return NextResponse.json(
      { error: "Error al activar tema" },
      { status: 500 },
    );
  }
}
