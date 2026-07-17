import { getSupabaseServiceClient } from "./admin-store"
import { ECOMMERCE_TABLES } from "./contract"
import { ADMIN_LIST_FETCH_LIMIT } from "@/lib/admin/constants"
import type { UserProfile } from "@/lib/types/user"

// A platform user plus the store their signup_store_id points to (D8), joined
// best-effort so the console can show a new user's registration origin
// alongside their global role. Null for every account that predates the
// column, or was minted by the platform (invited members, provisioned owners
// who reused an existing identity) rather than born from a storefront signup.
export type PlatformUser = UserProfile & {
  signupStoreName: string | null
}

// The whole-platform user list for the super_admin console (D8): the one place a
// super_admin legitimately sees every account. Reads user_profiles with the
// service client and is never scoped to a store — the deliberate cross-store
// counterpart to the store screen's per-store customer list, reachable only
// behind the platform console's super_admin gate.
export async function listPlatformUsers(supabaseOverride?: any): Promise<PlatformUser[]> {
  const service = supabaseOverride ?? getSupabaseServiceClient()
  if (!service) {
    return []
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .select(
      "id, email, first_name, last_name, role, created_at, signup_store:stores!signup_store_id(store_name)",
    )
    .order("created_at", { ascending: false })
    .limit(ADMIN_LIST_FETCH_LIMIT)

  if (error) {
    throw new Error(`No se pudieron listar los usuarios de la plataforma: ${error.message}`)
  }

  return (data ?? []).map(toPlatformUser)
}

type PlatformUserRow = UserProfile & {
  signup_store: { store_name: string } | null
}

function toPlatformUser(row: PlatformUserRow): PlatformUser {
  const { signup_store, ...profile } = row
  return { ...profile, signupStoreName: signup_store?.store_name ?? null }
}
