import { describe, expect, it } from "vitest"
import { canAccessAdmin, isSuperAdminRole } from "@/lib/memberships/roles"

describe("isSuperAdminRole", () => {
  it("treats 'super_admin' as super admin, case-insensitively", () => {
    expect(isSuperAdminRole("super_admin")).toBe(true)
    expect(isSuperAdminRole("SUPER_ADMIN")).toBe(true)
    expect(isSuperAdminRole("Super_Admin")).toBe(true)
  })

  it("rejects the retired 'admin' role along with 'user' and garbage values", () => {
    expect(isSuperAdminRole("admin")).toBe(false)
    expect(isSuperAdminRole("user")).toBe(false)
    expect(isSuperAdminRole(null)).toBe(false)
    expect(isSuperAdminRole(undefined)).toBe(false)
    expect(isSuperAdminRole(123)).toBe(false)
    expect(isSuperAdminRole({})).toBe(false)
    expect(isSuperAdminRole("")).toBe(false)
  })
})

describe("canAccessAdmin", () => {
  it("admits a global 'user' who manages at least one store", () => {
    expect(canAccessAdmin({ globalRole: "user", managesAnyStore: true })).toBe(true)
  })

  it("keeps out a global 'user' who manages no store", () => {
    expect(canAccessAdmin({ globalRole: "user", managesAnyStore: false })).toBe(false)
    expect(canAccessAdmin({ globalRole: null, managesAnyStore: false })).toBe(false)
  })

  // Without the role pass, a super_admin with no memberships could never reach
  // his own console behind the admin-host proxy gate.
  it("admits a super_admin with no membership by role", () => {
    expect(canAccessAdmin({ globalRole: "super_admin", managesAnyStore: false })).toBe(true)
  })

  it("no longer honors the retired global 'admin' role without membership", () => {
    expect(canAccessAdmin({ globalRole: "admin", managesAnyStore: false })).toBe(false)
    expect(canAccessAdmin({ globalRole: "admin", managesAnyStore: true })).toBe(true)
  })
})
