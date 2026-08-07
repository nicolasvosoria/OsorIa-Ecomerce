import { randomBytes } from "node:crypto";

import { getSupabaseServiceClient } from "./admin-store";
import { getServiceAuthAdminClient } from "./service-client";
import { ECOMMERCE_TABLES } from "./contract";
import { loadStoreIdentity, toTenantEmailBranding } from "./store-identity-api";
import {
  inviteNewIdentity,
  mintPendingMembershipInvite,
  provisionOrCompensate,
  resolveAuthIdentityByEmail,
} from "@/lib/auth/platform-identity-invites";
import { isStoreRoleName, type StoreRoleName } from "@/lib/memberships/roles";
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
  // True when the membership carries granted_by: today only the super_admin
  // support self-grant writes that column (D2), so the owner's team table can
  // honestly label the row as support access.
  isSupportAccess: boolean;
};

export type MembershipResult = { success: boolean; error?: string };

// D20/D21's three outcomes, discriminated so the UI never has to guess which
// fields a given result carries: an unknown email is natively invited
// (immediate membership -- nobody could have been hijacked, since nobody
// used that email before); one that already exists anywhere in this shared-
// pool project gets a pending acceptance instead of an instant grant; one
// already on this exact store's team just has its role replaced.
export type AddStoreMemberResult =
  | { success: true; outcome: "role_updated" }
  | { success: true; outcome: "invited" }
  | { success: true; outcome: "pending_acceptance" }
  | { success: false; error: string };

// A reset must hand the temp password to the operator even when the flag write
// fails after the password already changed — throwing it away would lock the
// owner behind a credential nobody knows. That half-applied case stays on the
// success arm, with `flagWarning` naming exactly what did and did not happen.
export type ResetOwnerCredentialResult =
  | { success: true; tempPassword: string; ownerEmail: string; flagWarning: string | null }
  | { success: false; error: string };

export type PlatformIdentityNames = { firstName?: string; lastName?: string };

type StoreRoleLinks = { roles: { role_name: string } | null }[] | null;

type ManagedMembershipRow = {
  store_id: string;
  store_user_roles: StoreRoleLinks;
};

// Stores a user can act as admin for: only those where they hold a managing
// membership ('owner'/'admin'), mirroring ecommerce.can_user_manage_store —
// a super_admin with no memberships gets none, and a store_users row without a
// managing role does not count.
export async function listStoresForUser(userId: string): Promise<StoreSummary[]> {
  const service = getSupabaseServiceClient();
  if (!service) {
    return [];
  }

  const { data: memberships, error: membershipsError } = await service
    .from(ECOMMERCE_TABLES.storeUsers)
    .select("store_id, store_user_roles(roles(role_name))")
    .eq("user_id", userId);

  if (membershipsError) {
    throw new Error(`No se pudieron listar las tiendas: ${membershipsError.message}`);
  }

  const storeIds = ((memberships ?? []) as ManagedMembershipRow[])
    .filter((membership) => findManagingRole(membership.store_user_roles) !== null)
    .map((membership) => membership.store_id);
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

function findManagingRole(links: StoreRoleLinks): StoreRoleName | null {
  return (links ?? []).map((link) => link.roles?.role_name).find(isStoreRoleName) ?? null;
}

type StoreUserRow = {
  user_id: string;
  granted_by: string | null;
  user_profiles: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  store_user_roles: StoreRoleLinks;
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
      "user_id, granted_by, user_profiles(email, first_name, last_name), store_user_roles(roles(role_name))",
    )
    .eq("store_id", storeId);

  if (error) {
    throw new Error(`No se pudieron listar los miembros: ${error.message}`);
  }

  return (data ?? []).map(toStoreMember);
}

// The store's owner(s): the members holding the 'owner' role. The credential
// reset targets exactly these — resolved server-side from the storeId, never
// from a client-supplied email or userId, because auth.users is shared across
// platform apps (#2347) and an arbitrary target could reach a foreign account.
export async function listStoreOwners(
  storeId: string,
  supabaseOverride?: any,
): Promise<StoreMember[]> {
  const members = await listStoreMembers(storeId, supabaseOverride);
  return members.filter((member) => member.role === "owner");
}

const RATE_LIMITED_INVITE_ERROR =
  "Ya enviamos una invitación hace poco. Espera un momento antes de volver a intentarlo.";
const GENERIC_INVITE_ERROR = "No se pudo enviar la invitación";
const NOT_AUTHORIZED_INVITE_ERROR = "No tienes permiso para invitar a esta tienda";

// Adds a member to the store by email. Three outcomes (D20/D21), decided by
// whether the email already exists ANYWHERE in this shared-pool project's
// auth.users (resolveAuthIdentityByEmail, never ecommerce.user_profiles
// alone):
//   - already a member of THIS store -> role_updated, same as before
//   - exists elsewhere in the org, not yet a member here -> D21's pending
//     acceptance; no store_users row is written until the intended user
//     accepts
//   - unknown anywhere -> D20's native invite, immediate membership (nobody
//     could have been hijacked, since nobody used that email before), with
//     compensation if profile/membership provisioning fails afterward
export async function addStoreMember(
  storeId: string,
  actorUserId: string,
  email: string,
  roleName: StoreRoleName,
  supabaseOverride?: any,
): Promise<AddStoreMemberResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const identity = await resolveAuthIdentityByEmail(service, normalizedEmail);
    if (!identity.exists) {
      return await inviteAndProvisionMember(service, { storeId, email: normalizedEmail, roleName });
    }

    const existingStoreUserId = await findStoreUserId(service, storeId, identity.userId);
    if (existingStoreUserId) {
      const roleId = await resolveStoreRoleId(service, storeId, roleName);
      await assignSingleRole(service, existingStoreUserId, roleId);
      return { success: true, outcome: "role_updated" };
    }

    return await sendPendingMembershipInvite(service, {
      actorUserId,
      storeId,
      intendedUserId: identity.userId,
      email: normalizedEmail,
      roleName,
    });
  } catch (error) {
    return { success: false, error: toMembershipErrorMessage(error) };
  }
}

// D20's branch: needs the store's own subdomain for the invite link
// (lib/email/urls.ts's getTenantUrl), so this loads the store's identity
// once instead of threading a second parameter through addStoreMember for
// what is otherwise the D21 branch's own dependency.
async function inviteAndProvisionMember(
  service: any,
  input: { storeId: string; email: string; roleName: StoreRoleName },
): Promise<AddStoreMemberResult> {
  const identity = await loadStoreIdentity(service, input.storeId);

  const invited = await inviteNewIdentity(service, {
    storeId: input.storeId,
    subdomain: identity.subdomain,
    email: input.email,
    purpose: "new_user_invite",
  });

  // D24: a real limiter-check failure reads identically to a genuine rate
  // limit -- see InviteNewIdentityResult's rate_limit_check_failed comment.
  if (invited.outcome === "rate_limited" || invited.outcome === "rate_limit_check_failed") {
    return { success: false, error: RATE_LIMITED_INVITE_ERROR };
  }
  if (invited.outcome === "email_exists") {
    return { success: false, error: "Ese correo acaba de registrarse en la plataforma. Intenta de nuevo." };
  }
  if (invited.outcome === "error") {
    return { success: false, error: invited.error };
  }

  await provisionOrCompensate(invited.userId, async () => {
    await insertInvitedProfile(service, invited.userId, input.email, {});
    const storeUserId = await ensureStoreUser(service, input.storeId, invited.userId);
    const roleId = await resolveStoreRoleId(service, input.storeId, input.roleName);
    await assignSingleRole(service, storeUserId, roleId);
  });

  return { success: true, outcome: "invited" };
}

async function sendPendingMembershipInvite(
  service: any,
  input: {
    actorUserId: string;
    storeId: string;
    intendedUserId: string;
    email: string;
    roleName: StoreRoleName;
  },
): Promise<AddStoreMemberResult> {
  const identity = await loadStoreIdentity(service, input.storeId);
  const result = await mintPendingMembershipInvite(service, {
    actorUserId: input.actorUserId,
    storeId: input.storeId,
    intendedUserId: input.intendedUserId,
    email: input.email,
    roleName: input.roleName,
    branding: toTenantEmailBranding(identity),
  });

  if (result.outcome === "invited") {
    return { success: true, outcome: "pending_acceptance" };
  }
  // D24: same shape as inviteAndProvisionMember's own rate_limit_check_failed
  // handling above -- request_membership_invite's internal limiter check can
  // fail on its own terms, and must read identically to a genuine rate limit.
  if (result.outcome === "rate_limited" || result.outcome === "rate_limit_check_failed") {
    return { success: false, error: RATE_LIMITED_INVITE_ERROR };
  }
  if (result.outcome === "not_authorized") {
    return { success: false, error: NOT_AUTHORIZED_INVITE_ERROR };
  }
  return { success: false, error: "error" in result ? result.error : GENERIC_INVITE_ERROR };
}

// 24 random bytes (~32 base64url chars) clears Supabase's 6-char minimum with a
// wide margin and is unguessable. Still used by resetOwnerCredential (D7) --
// unrelated to D20's native invite, which never mints a password at all.
const TEMP_PASSWORD_BYTES = 24;

function generateTempPassword(): string {
  return randomBytes(TEMP_PASSWORD_BYTES).toString("base64url");
}

// Seeds the ecommerce profile for a freshly invited identity (D20), mirroring
// the normal sign-up insert (no role -> DB default 'user'). Never sets
// must_change_password: a D20 invite is held to setup-only routes by D22's
// app_metadata flag instead, a stronger, session-wide restriction that
// column was never enough to express. Surfaces the insert error instead of
// dropping it, so a failed profile never passes silently -- the caller
// (inviteAndProvisionMember/stores-admin-api.ts) wraps this in
// provisionOrCompensate, so a thrown error here still reverts the identity.
export async function insertInvitedProfile(
  service: any,
  userId: string,
  email: string,
  names: PlatformIdentityNames,
): Promise<void> {
  const { error } = await service.from(ECOMMERCE_TABLES.userProfiles).insert({
    id: userId,
    email,
    first_name: names.firstName ?? null,
    last_name: names.lastName ?? null,
  });

  if (error) {
    throw new Error(`No se pudo crear el perfil de ecommerce: ${error.message}`);
  }
}

// The legitimate support path (D2): a super_admin self-assigns an 'admin'
// membership (A1), recording themselves in granted_by so the owner's team table
// shows the row as support access and the owner can revoke it like any other
// membership. Already a member: nothing changes — the existing role (possibly
// 'owner') and any previous granted_by stand.
export async function grantSupportMembership(
  storeId: string,
  userId: string,
  supabaseOverride?: any,
): Promise<MembershipResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  if (!service) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    const existingMembership = await findStoreUserId(service, storeId, userId);
    if (existingMembership) {
      return { success: true };
    }

    const storeUserId = await ensureStoreUser(service, storeId, userId, { grantedBy: userId });
    const roleId = await resolveStoreRoleId(service, storeId, "admin");
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

// Whether this user still holds the temporary password resetOwnerCredential
// (D7) minted. The admin guard reads it to force the change before any admin
// use; it is false for everyone who set their own password, so the guard
// never fires for them. Unrelated to D20/D22's invited-session restriction,
// which never touches this column -- see insertInvitedProfile's comment.
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

// Support reset (D7): regenerates the store owner's password as a new temporary
// one and re-arms the forced change, so the super_admin unlocks the owner
// without entering the store. Ordered password-first, flag-second: a failed
// password update changes nothing, and the flag is only ever armed for a
// password this call actually set. The reverse order could brand a credential
// as temporary when it never changed.
export async function resetOwnerCredential(
  storeId: string,
  supabaseOverride?: any,
): Promise<ResetOwnerCredentialResult> {
  const service = supabaseOverride ?? getSupabaseServiceClient();
  const authAdmin = getServiceAuthAdminClient();
  if (!service || !authAdmin) {
    return { success: false, error: "Supabase no configurado" };
  }

  try {
    const owner = await resolveSingleOwner(storeId, service);
    const tempPassword = generateTempPassword();
    await replaceUserPassword(authAdmin, owner.userId, tempPassword);
    const flagWarning = await armMustChangePassword(service, owner.userId);

    return { success: true, tempPassword, ownerEmail: owner.email, flagWarning };
  } catch (error) {
    return { success: false, error: toMembershipErrorMessage(error) };
  }
}

const NO_OWNER_ERROR =
  "La tienda no tiene ningún miembro con rol de dueño; no hay credencial que restablecer.";
const MULTIPLE_OWNERS_ERROR =
  "La tienda tiene más de un dueño y esta acción solo admite uno.";

async function resolveSingleOwner(storeId: string, service: any): Promise<StoreMember> {
  const owners = await listStoreOwners(storeId, service);
  if (owners.length === 0) {
    throw new Error(NO_OWNER_ERROR);
  }
  if (owners.length > 1) {
    throw new Error(MULTIPLE_OWNERS_ERROR);
  }

  return owners[0];
}

async function replaceUserPassword(
  authAdmin: any,
  userId: string,
  password: string,
): Promise<void> {
  const { error } = await authAdmin.auth.admin.updateUserById(userId, { password });
  if (error) {
    throw new Error(`No se pudo restablecer la contraseña: ${error.message}`);
  }
}

// Runs only after the password already changed: a failure here must NOT throw,
// or the fresh temp password would be lost with the owner locked out behind it.
// It comes back as a warning that tells the operator the reset DID happen.
async function armMustChangePassword(service: any, userId: string): Promise<string | null> {
  const { error } = await service
    .from(ECOMMERCE_TABLES.userProfiles)
    .update({ must_change_password: true })
    .eq("id", userId);

  if (!error) {
    return null;
  }

  return (
    "La contraseña sí se restableció y la anterior ya no funciona, pero no se pudo " +
    `forzar el cambio en el próximo inicio de sesión: ${error.message}. Comparte la ` +
    "contraseña temporal y vuelve a ejecutar el restablecimiento para forzarlo."
  );
}

function toStoreMember(row: StoreUserRow): StoreMember {
  return {
    userId: row.user_id,
    email: row.user_profiles?.email ?? "",
    name: formatMemberName(row.user_profiles),
    role: findManagingRole(row.store_user_roles),
    isSupportAccess: row.granted_by != null,
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

// `grantedBy` is only ever set by the support self-grant (D2); every other
// caller leaves the column untouched so its presence stays a truthful signal.
// Exported: stores-admin-api.ts's createTenant reuses this exact primitive
// to grant ownership once a D20-invited or D21-accepted owner is ready,
// instead of a second, competing way to write the same store_users row.
export async function ensureStoreUser(
  service: any,
  storeId: string,
  userId: string,
  { grantedBy }: { grantedBy?: string } = {},
): Promise<string> {
  const existing = await findStoreUserId(service, storeId, userId);
  if (existing) {
    return existing;
  }

  const { data, error } = await service
    .from(ECOMMERCE_TABLES.storeUsers)
    .insert({ store_id: storeId, user_id: userId, ...(grantedBy ? { granted_by: grantedBy } : {}) })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "No se pudo crear la membresía");
  }

  return data.id;
}

export async function resolveStoreRoleId(
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

export async function assignSingleRole(
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
