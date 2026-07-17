import { getSupabaseEcommerce } from "./client";
import { ECOMMERCE_SCHEMA, ECOMMERCE_TABLES, ECOMMERCE_VIEWS } from "./contract";
import type { ComponentStyle } from "./types";
import { requireAdmin } from "./permissions-api";
import { getAdminRequestHeaders } from "./admin-request-headers";
import { getRuntimeStoreId, normalizeRuntimeStoreId } from "@/lib/utils/store";

function mapLegacyStyle(row: any): ComponentStyle {
  return {
    id: row.id,
    component_name: row.component_name,
    store_id: row.store_id,
    variables: row.style_config ?? row.variables ?? {},
    updated_at: row.updated_at,
  };
}

async function resolveDefaultComponentStyleStoreId(
  supabase: ReturnType<typeof getSupabaseEcommerce>,
): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(ECOMMERCE_VIEWS.storesLegacy)
    .select("id")
    .eq("subdomain", "default")
    .single();

  if (error || !data?.id) {
    console.warn("[v0] Default store not found for component styles");
    return null;
  }

  return data.id as string;
}

// `storeIdOverride` lets the theme editor read the ACTIVE store (D10) instead of
// the host: the storefront omits it and stays host-scoped, so switching stores
// no longer reads one store while the writes target another (#2345).
async function resolveComponentStyleStoreId(
  supabase: ReturnType<typeof getSupabaseEcommerce>,
  storeIdOverride?: string,
): Promise<string | null> {
  const overrideStoreId = normalizeRuntimeStoreId(storeIdOverride);
  if (overrideStoreId) return overrideStoreId;

  const runtimeStoreId = await getRuntimeStoreId();
  if (runtimeStoreId) return runtimeStoreId;

  return resolveDefaultComponentStyleStoreId(supabase);
}

export async function getComponentStyles(storeId?: string): Promise<ComponentStyle[]> {
  const supabase = getSupabaseEcommerce();
  if (!supabase) return [];

  const resolvedStoreId = await resolveComponentStyleStoreId(supabase, storeId);
  if (!resolvedStoreId) {
    console.warn("[v0] No store_id available, returning empty array");
    return [];
  }

  const { data, error } = await supabase
    .from(ECOMMERCE_VIEWS.componentStylesLegacy)
    .select("*")
    .eq("store_id", resolvedStoreId)
    .order("component_name");

  if (error) {
    console.error("[v0] Error fetching component styles:", error);
    return [];
  }

  return (data ?? []).map(mapLegacyStyle);
}

export async function getComponentStyleByName(componentName: string) {
  const supabase = getSupabaseEcommerce();
  if (!supabase) return null;

  const storeId = await resolveComponentStyleStoreId(supabase);
  if (!storeId) {
    console.warn(`[v0] No store_id available for ${componentName}`);
    return null;
  }

  const { data, error } = await supabase
    .from(ECOMMERCE_VIEWS.componentStylesLegacy)
    .select("*")
    .eq("component_name", componentName)
    .eq("store_id", storeId)
    .single();

  if (error) {
    console.error(`[v0] Error fetching style for ${componentName}:`, error);
    return null;
  }

  return data ? mapLegacyStyle(data) : null;
}

export async function updateComponentStyle(
  componentName: string,
  variables: Record<string, any>,
) {
  await requireAdmin();

  const response = await fetch("/api/admin/component-styles", {
    method: "POST",
    headers: await getAdminRequestHeaders(),
    body: JSON.stringify({
      componentName,
      variables,
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `Failed to update style for ${componentName}`;

    throw new Error(message);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !payload.data
  ) {
    throw new Error(
      `Failed to update style for ${componentName}: no data returned`,
    );
  }

  return payload.data as ComponentStyle;
}

export async function subscribeToStyleChanges(
  componentName: string,
  callback: (payload: ComponentStyle) => void,
) {
  const supabase = getSupabaseEcommerce();
  if (!supabase) return { unsubscribe: () => {} };

  try {
    const storeId = await resolveComponentStyleStoreId(supabase);
    if (!storeId) return { unsubscribe: () => {} };

    const channel = supabase
      .channel(`component_styles:${componentName}:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: ECOMMERCE_SCHEMA,
          table: ECOMMERCE_TABLES.componentStyles,
          filter: `component_name=eq.${componentName}`,
        },
        (payload: any) => {
          // Solo procesar si el store_id coincide
          if (payload.new && payload.new.store_id === storeId) {
            callback(payload.new as ComponentStyle);
          }
        },
      )
      .subscribe();

    return channel;
  } catch {
    // Falla silenciosamente si el realtime no está disponible
    // Esto no es crítico para la funcionalidad básica
    return {
      unsubscribe: () => {},
    };
  }
}
