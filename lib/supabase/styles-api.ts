import { getSupabaseEcommerce } from "./client";
import type { ComponentStyle } from "./types";
import { requireAdmin } from "./permissions-api";
import { getAdminRequestHeaders } from "./admin-request-headers";
import { getStoreId } from "@/lib/utils/store";

function mapLegacyStyle(row: any): ComponentStyle {
  return {
    id: row.id,
    component_name: row.component_name,
    store_id: row.store_id,
    variables: row.style_config ?? row.variables ?? {},
    updated_at: row.updated_at,
  };
}

export async function getComponentStyles() {
  const supabase = getSupabaseEcommerce();
  if (!supabase) return [];

  const storeId = await getStoreId();
  if (!storeId) {
    console.warn("[v0] No store_id available, returning empty array");
    return [];
  }

  const { data, error } = await supabase
    .from("component_styles_legacy")
    .select("*")
    .eq("store_id", storeId)
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

  let storeId: string | null = null;
  if (componentName === "hero") {
    const { data: defaultStore } = await supabase
      .from("stores_legacy")
      .select("id")
      .eq("subdomain", "default")
      .single();
    if (!defaultStore?.id) {
      console.warn(`[v0] Default store not found for ${componentName}`);
      return null;
    }
    storeId = defaultStore.id;
  } else {
    storeId = await getStoreId();
    if (!storeId) {
      console.warn(`[v0] No store_id available for ${componentName}`);
      return null;
    }
  }

  const { data, error } = await supabase
    .from("component_styles_legacy")
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
    const storeId = await getStoreId();
    if (!storeId) return { unsubscribe: () => {} };

    const channel = supabase
      .channel(`component_styles:${componentName}:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "ecommerce",
          table: "component_styles",
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
  } catch (error) {
    // Falla silenciosamente si el realtime no está disponible
    // Esto no es crítico para la funcionalidad básica
    return {
      unsubscribe: () => {},
    };
  }
}
