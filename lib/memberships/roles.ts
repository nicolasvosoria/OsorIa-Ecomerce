import type { UserRole } from "@/lib/types/user"

// Store roles offered when assigning a member. Only the roles that
// ecommerce.can_manage_store recognizes as managers are exposed: there is no
// gradual permission system, so a non-manager store role would grant no access.
export const STORE_ROLE_NAMES = ["owner", "admin"] as const
export type StoreRoleName = (typeof STORE_ROLE_NAMES)[number]

export const STORE_ROLE_LABELS: Record<StoreRoleName, string> = {
  owner: "Propietario",
  admin: "Administrador",
}

// Global platform roles stored in user_profiles.role. Editing these is
// super_admin-only authority, never granted by the per-store gate.
export const GLOBAL_ROLE_NAMES = ["user", "admin", "super_admin"] as const satisfies readonly UserRole[]

export const GLOBAL_ROLE_LABELS: Record<UserRole, string> = {
  user: "Usuario",
  admin: "Administrador",
  super_admin: "Super Admin",
}

export function isStoreRoleName(value: unknown): value is StoreRoleName {
  return typeof value === "string" && (STORE_ROLE_NAMES as readonly string[]).includes(value)
}

export function isGlobalRoleName(value: unknown): value is UserRole {
  return typeof value === "string" && (GLOBAL_ROLE_NAMES as readonly string[]).includes(value)
}

function normalizeRoleName(role: unknown): string | null {
  return typeof role === "string" ? role.toLowerCase() : null
}

export function isSuperAdminRole(role: unknown): boolean {
  return normalizeRoleName(role) === "super_admin"
}

export function isAdminRole(role: unknown): boolean {
  return normalizeRoleName(role) === "admin" || isSuperAdminRole(role)
}
