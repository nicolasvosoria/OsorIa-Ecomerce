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

async function resolveTargetStoreId(componentName: string, supabase: any) {
  if (componentName === "hero") {
    return resolveDefaultStoreId(supabase);
  }

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

    const storeId = await resolveTargetStoreId(componentName, supabase);
    const timestamp = new Date().toISOString();
    const { data: existing, error: checkError } = await supabase
      .from("component_styles")
      .select("id")
      .eq("component_name", componentName)
      .eq("store_id", storeId)
      .maybeSingle();

    if (checkError && checkError.code !== "PGRST116") {
      throw checkError;
    }

    const table = supabase.from("component_styles");
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
