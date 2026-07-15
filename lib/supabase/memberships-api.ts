import { getSupabaseServiceClient } from "./admin-store";
import { ECOMMERCE_TABLES } from "./contract";
import { isStoreRoleName, isSuperAdminRole, type StoreRoleName } from "@/lib/memberships/roles";
import type { UserRole } from "@/lib/types/user";

export type StoreSummary = {
  id: string;
  store_name: string;
  subdomain: string;
};

export type StoreMember = {
  userId: string;
  email: string;
  name: string;
  role: StoreRoleName | null;
};

export type MembershipResult = { success: boolean; error?: string };

// Stores a user can act as admin for: every store for a super_admin/global
// admin, otherwise only the stores they hold a store_users membership in.
export async function listStoresForUser(userId: string): Promise<StoreSummary[]> {
  const service = getSupabaseServiceClient();
  if (!service) {
    return [];
  }

  return (await isGlobalAdmin(service, userId))
    ? listAllStores(service)
    : listMemberStores(service, userId);
}

async function isGlobalAdmin(service: any, userId: string): Promise<boolean> {
  const { data } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .select("role")
    .eq("id", userId)
    .single();

  return isSuperAdminRole(data?.role);
}

async function listAllStores(service: any): Promise<StoreSummary[]> {
  const { data, error } = await service
    .from(ECOMMERCE_TABLES.stores)
    .select("id, store_name, subdomain")
    .is("deleted_at", null)
    .order("store_name");

  if (error) {
    throw new Error(`No se pudieron listar las tiendas: ${error.message}`);
  }

  return data ?? [];
}

async function listMemberStores(service: any, userId: string): Promise<StoreSummary[]> {
  const { data: memberships, error: membershipsError } = await service
    .from(ECOMMERCE_TABLES.storeUsers)
    .select("store_id")
    .eq("user_id", userId);

  if (membershipsError) {
    throw new Error(`No se pudieron listar las tiendas: ${membershipsError.message}`);
  }

  const storeIds = (memberships ?? []).map((membership: { store_id: string }) => membership.store_id);
  if (storeIds.length === 0) {
    return [];
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.stores)
    .select("id, store_name, subdomain")
    .in("id", storeIds)
    .is("deleted_at", null)
    .order("store_name");

  if (error) {
    throw new Error(`No se pudieron listar las tiendas: ${error.message}`);
  }

  return data ?? [];
}

type StoreUserRow = {
  user_id: string;
  user_profiles: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  store_user_roles: { roles: { role_name: string } | null }[] | null;
};

// The active store's team: members joined to their profile and store role.
// Every query is scoped by the passed storeId — that explicit filter is the
// tenant isolation, since the service client bypasses RLS.
export async function listStoreMembers(
  storeId: string,
  supabaseOverride?: any,
): Promise<StoreMember[]> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return [];
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.storeUsers)
    .select(
      "user_id, user_profiles(email, first_name, last_name), store_user_roles(roles(role_name))",
    )
    .eq("store_id", storeId);

  if (error) {
    throw new Error(`No se pudieron listar los miembros: ${error.message}`);
  }

  return (data ?? []).map(toStoreMember);
}

// Adds an EXISTING platform user to the store by email. Never creates accounts:
// an unknown email returns a clear error. Re-adding an existing member updates
// their store role instead of duplicating the membership.
export async function addStoreMember(
  storeId: string,
  email: string,
  roleName: StoreRoleName,
  supabaseOverride?: any,
): Promise<MembershipResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    const userId = await findUserIdByEmail(email, service);
    if (!userId) {
      return { success: false, error: "No existe un usuario registrado con ese correo" };
    }

    const storeUserId = await ensureStoreUser(service, storeId, userId);
    const roleId = await resolveStoreRoleId(service, storeId, roleName);
    await assignSingleRole(service, storeUserId, roleId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toMembershipErrorMessage(error) };
  }
}

// Changes an existing member's store role, replacing their current role link.
export async function upsertMembershipRole(
  storeId: string,
  userId: string,
  roleName: StoreRoleName,
  supabaseOverride?: any,
): Promise<MembershipResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    const storeUserId = await findStoreUserId(service, storeId, userId);
    if (!storeUserId) {
      return { success: false, error: "El usuario no pertenece a esta tienda" };
    }

    const roleId = await resolveStoreRoleId(service, storeId, roleName);
    await assignSingleRole(service, storeUserId, roleId);
    return { success: true };
  } catch (error) {
    return { success: false, error: toMembershipErrorMessage(error) };
  }
}

// Removes a user from the store: drops their role links, then the membership.
export async function removeMembership(
  storeId: string,
  userId: string,
  supabaseOverride?: any,
): Promise<MembershipResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    const storeUserId = await findStoreUserId(service, storeId, userId);
    if (!storeUserId) {
      return { success: true };
    }

    await service
      .from(ECOMMERCE_TABLES.storeUserRoles)
      .delete()
      .eq("store_user_id", storeUserId);

    const { error } = await service
      .from(ECOMMERCE_TABLES.storeUsers)
      .delete()
      .eq("id", storeUserId)
      .eq("store_id", storeId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: toMembershipErrorMessage(error) };
  }
}

// Sets a user's GLOBAL platform role. Authorized only via authorizeSuperAdmin at
// the action layer — this function trusts its caller for that gate.
export async function setUserGlobalRole(
  userId: string,
  role: UserRole,
  supabaseOverride?: any,
): Promise<MembershipResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  const { error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .update({ role })
    .eq("id", userId);

  if (error) {
    return { success: false, error: `No se pudo actualizar el rol: ${error.message}` };
  }

  return { success: true };
}

function toStoreMember(row: StoreUserRow): StoreMember {
  const role =
    (row.store_user_roles ?? [])
      .map((link) => link.roles?.role_name)
      .find(isStoreRoleName) ?? null;

  return {
    userId: row.user_id,
    email: row.user_profiles?.email ?? "",
    name: formatMemberName(row.user_profiles),
    role,
  };
}

function formatMemberName(profile: StoreUserRow["user_profiles"]): string {
  const fullName = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim();
  return fullName || "Sin nombre";
}

// Resolves a platform account by email. Exported so callers can identify the
// person behind an email before acting on them; returns null for an unknown one.
export async function findUserIdByEmail(
  email: string,
  supabaseOverride?: any,
): Promise<string | null> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    throw new Error("Supabase no configurado");
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .select("id")
    .ilike("email", email.trim())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function findStoreUserId(
  service: any,
  storeId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await service
    .from(ECOMMERCE_TABLES.storeUsers)
    .select("id")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ?? null;
}

async function ensureStoreUser(
  service: any,
  storeId: string,
  userId: string,
): Promise<string> {
  const existing = await findStoreUserId(service, storeId, userId);
  if (existing) {
    return existing;
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.storeUsers)
    .insert({ store_id: storeId, user_id: userId })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "No se pudo crear la membresía");
  }

  return data.id;
}

async function resolveStoreRoleId(
  service: any,
  storeId: string,
  roleName: StoreRoleName,
): Promise<string> {
  const { data: existing, error: findError } = await service
    .from(ECOMMERCE_TABLES.roles)
    .select("id")
    .eq("store_id", storeId)
    .eq("role_name", roleName)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: insertError } = await service
    .from(ECOMMERCE_TABLES.roles)
    .insert({ store_id: storeId, role_name: roleName, is_system: false })
    .select("id")
    .single();

  if (insertError || !created?.id) {
    throw new Error(insertError?.message ?? "No se pudo crear el rol de la tienda");
  }

  return created.id;
}

async function assignSingleRole(
  service: any,
  storeUserId: string,
  roleId: string,
): Promise<void> {
  const { error: deleteError } = await service
    .from(ECOMMERCE_TABLES.storeUserRoles)
    .delete()
    .eq("store_user_id", storeUserId);

  if (deleteError) {
    throw new Error(`No se pudieron quitar los roles anteriores: ${deleteError.message}`);
  }

  const { error } = await service
    .from(ECOMMERCE_TABLES.storeUserRoles)
    .insert({ store_user_id: storeUserId, role_id: roleId });

  if (error) {
    throw new Error(error.message);
  }
}

function toMembershipErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error inesperado al gestionar el miembro";
}
