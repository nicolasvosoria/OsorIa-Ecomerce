import { randomBytes } from "node:crypto";

import { getSupabaseServiceClient } from "./admin-store";
import { getServiceAuthAdminClient } from "./service-client";
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

// Adding a member can now mint a brand-new platform identity, so its result
// carries the one-time temporary password on that path (D21). Kept separate from
// MembershipResult so the three role/removal actions never see a `tempPassword`
// field they can't produce.
export type AddStoreMemberResult =
  | { success: true; created: false }
  | { success: true; created: true; tempPassword: string }
  | { success: false; error: string };

// Outcome of resolving a platform account behind an email. `created` discriminates
// the freshly-minted identity (which carries the temporary password its owner must
// change on first entry) from one that already had an ecommerce profile.
export type EnsurePlatformUserResult =
  | { userId: string; created: false }
  | { userId: string; created: true; tempPassword: string };

type PlatformUserNames = { firstName?: string; lastName?: string };

const FOREIGN_PLATFORM_ACCOUNT_ERROR =
  "Ese correo ya pertenece a una cuenta de la plataforma pero no del ecommerce. Usa otro correo.";

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

// Adds a member to the store by email. An email with an ecommerce profile is
// attached directly; an unknown email is minted a platform account first (D21).
// Re-adding an existing member updates their store role instead of duplicating
// the membership. When a new identity is minted its temporary password is returned.
export async function addStoreMember(
  storeId: string,
  email: string,
  roleName: StoreRoleName,
  supabaseOverride?: any,
): Promise<AddStoreMemberResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    const platformUser = await ensurePlatformUserByEmail(email, service);
    const storeUserId = await ensureStoreUser(service, storeId, platformUser.userId);
    const roleId = await resolveStoreRoleId(service, storeId, roleName);
    await assignSingleRole(service, storeUserId, roleId);

    return platformUser.created
      ? { success: true, created: true, tempPassword: platformUser.tempPassword }
      : { success: true, created: false };
  } catch (error) {
    return { success: false, error: toMembershipErrorMessage(error) };
  }
}

// Resolves the platform identity behind an email, minting one when it is unknown
// to the whole platform (D21/D15). Three outcomes, in order:
//   - profile exists  -> reuse its user id, create nothing
//   - unknown email    -> create a confirmed account with a temporary password,
//                         seed an ecommerce profile (role defaults to 'user',
//                         must_change_password true), return that password
//   - belongs to auth but not ecommerce -> a clear error (D20): createUser
//                         collides with `email_exists`, and we deliberately do
//                         not look up or adopt an account another platform app
//                         owns.
// D21 replaces the invite link (D9): the shared project's Site URL redirects to
// copaosoria, so an owner never reaches this app through an emailed link. Instead
// the operator hands off the temporary password and the owner logs in here.
export async function ensurePlatformUserByEmail(
  email: string,
  service: any,
  names: PlatformUserNames = {},
): Promise<EnsurePlatformUserResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUserId = await findUserIdByEmail(normalizedEmail, service);
  if (existingUserId) {
    return { userId: existingUserId, created: false };
  }

  const authAdmin = getServiceAuthAdminClient();
  if (!authAdmin) {
    throw new Error("Supabase no configurado");
  }

  const tempPassword = generateTempPassword();
  const userId = await createConfirmedIdentity(authAdmin, normalizedEmail, tempPassword);
  await insertInvitedProfile(service, userId, normalizedEmail, names);

  return { userId, created: true, tempPassword };
}

// 24 random bytes (~32 base64url chars) clears Supabase's 6-char minimum with a
// wide margin and is unguessable; the owner replaces it on first entry anyway.
const TEMP_PASSWORD_BYTES = 24;

function generateTempPassword(): string {
  return randomBytes(TEMP_PASSWORD_BYTES).toString("base64url");
}

// Creates the owner's account already email-confirmed, so no verification mail is
// sent and no redirect to the shared project's Site URL ever happens. Wraps the
// call because `on_auth_user_created_copaosoria` — a foreign AFTER INSERT trigger
// with no exception handling — can abort it, and an already-registered email comes
// back as `email_exists` rather than a throw.
async function createConfirmedIdentity(
  authAdmin: any,
  email: string,
  password: string,
): Promise<string> {
  let response: { data: any; error: any };
  try {
    response = await authAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  } catch (error) {
    throw new Error(`No se pudo crear la cuenta del dueño: ${toMembershipErrorMessage(error)}`);
  }

  const { data, error } = response;
  if (error) {
    if (error.code === "email_exists") {
      throw new Error(FOREIGN_PLATFORM_ACCOUNT_ERROR);
    }
    throw new Error(`No se pudo crear la cuenta del dueño: ${error.message}`);
  }

  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("No se pudo crear la cuenta del dueño");
  }

  return userId;
}

// Seeds the ecommerce profile for a freshly-minted identity, mirroring the normal
// sign-up insert (no role -> DB default 'user') but flagging must_change_password
// so the admin forces the owner off the temporary password on first entry.
// Surfaces the insert error instead of dropping it, so a failed profile never
// passes silently.
async function insertInvitedProfile(
  service: any,
  userId: string,
  email: string,
  names: PlatformUserNames,
): Promise<void> {
  const { error } = await service.from(ECOMMERCE_TABLES.userProfiles).insert({
    id: userId,
    email,
    first_name: names.firstName ?? null,
    last_name: names.lastName ?? null,
    must_change_password: true,
  });

  if (error) {
    throw new Error(`No se pudo crear el perfil de ecommerce: ${error.message}`);
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

// Whether this user still holds the temporary password an owner-invite minted
// (D21). The admin guard reads it to force the change before any admin use; it is
// false for everyone who set their own password, so the guard never fires for them.
export async function requiresPasswordChange(
  userId: string,
  supabaseOverride?: any,
): Promise<boolean> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return false;
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .select("must_change_password")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`No se pudo verificar el estado de la contraseña: ${error.message}`);
  }

  return data?.must_change_password === true;
}

// Clears the forced-change flag once the owner has replaced the temporary password.
// The caller passes the userId it resolved from the session — never from client
// input — so a user can only clear their own flag.
export async function clearMustChangePassword(
  userId: string,
  supabaseOverride?: any,
): Promise<MembershipResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  const { error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .update({ must_change_password: false })
    .eq("id", userId);

  if (error) {
    return { success: false, error: `No se pudo actualizar la contraseña: ${error.message}` };
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
