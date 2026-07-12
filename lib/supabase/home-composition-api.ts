import { getSupabaseEcommerce } from "./client";
import { ECOMMERCE_TABLES, ECOMMERCE_VIEWS } from "./contract";
import type { HomeSectionEntry } from "./types";
import { getRuntimeStoreId } from "@/lib/utils/store";
import { resolveHomeComposition } from "@/lib/sections/home-composition";
import { requireAdmin } from "./permissions-api";
import { getAdminRequestHeaders } from "./admin-request-headers";

async function resolveDefaultHomeCompositionStoreId(
  supabase: ReturnType<typeof getSupabaseEcommerce>,
): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(ECOMMERCE_VIEWS.storesLegacy)
    .select("id")
    .eq("subdomain", "default")
    .single();

  if (error || !data?.id) {
    console.warn("[v0] Default store not found for home composition");
    return null;
  }

  return data.id as string;
}

async function resolveHomeCompositionStoreId(
  supabase: ReturnType<typeof getSupabaseEcommerce>,
): Promise<string | null> {
  const runtimeStoreId = await getRuntimeStoreId();
  if (runtimeStoreId) return runtimeStoreId;

  return resolveDefaultHomeCompositionStoreId(supabase);
}

// Reads the store's saved home section order/visibility. Falls back to the
// resolved default composition (today's home, unchanged) when the store
// hasn't saved a layout yet, when no store can be resolved, or when the
// lookup itself fails.
export async function getHomeComposition(): Promise<HomeSectionEntry[]> {
  const supabase = getSupabaseEcommerce();
  if (!supabase) return resolveHomeComposition(null);

  const resolvedStoreId = await resolveHomeCompositionStoreId(supabase);
  if (!resolvedStoreId) return resolveHomeComposition(null);

  const { data, error } = await supabase
    .from(ECOMMERCE_TABLES.homeSectionLayout)
    .select("sections")
    .eq("store_id", resolvedStoreId)
    .maybeSingle();

  if (error) {
    console.error("[v0] Error fetching home composition:", error);
  }

  return resolveHomeComposition(data?.sections ?? null);
}

export async function updateHomeComposition(
  sections: HomeSectionEntry[],
): Promise<HomeSectionEntry[]> {
  await requireAdmin();

  const response = await fetch("/api/admin/home-composition", {
    method: "POST",
    headers: await getAdminRequestHeaders(),
    body: JSON.stringify({ sections }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Failed to update home composition";

    throw new Error(message);
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("data" in payload) ||
    !payload.data
  ) {
    throw new Error("Failed to update home composition: no data returned");
  }

  return payload.data as HomeSectionEntry[];
}
