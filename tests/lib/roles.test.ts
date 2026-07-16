import { describe, expect, it } from "vitest"
import { canAccessAdmin, isAdminRole } from "@/lib/memberships/roles"

describe("isAdminRole", () => {
  it("treats 'admin' as an admin, case-insensitively", () => {
    expect(isAdminRole("admin")).toBe(true)
    expect(isAdminRole("ADMIN")).toBe(true)
    expect(isAdminRole("Admin")).toBe(true)
  })

  it("treats 'super_admin' as an admin, case-insensitively", () => {
    expect(isAdminRole("super_admin")).toBe(true)
    expect(isAdminRole("SUPER_ADMIN")).toBe(true)
    expect(isAdminRole("Super_Admin")).toBe(true)
  })

  it("rejects 'user', null, undefined, and garbage values", () => {
    expect(isAdminRole("user")).toBe(false)
    expect(isAdminRole(null)).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
    expect(isAdminRole(123)).toBe(false)
    expect(isAdminRole({})).toBe(false)
    expect(isAdminRole("")).toBe(false)
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

  it("admits global admins and super_admins with no membership", () => {
    expect(canAccessAdmin({ globalRole: "admin", managesAnyStore: false })).toBe(true)
    expect(canAccessAdmin({ globalRole: "super_admin", managesAnyStore: false })).toBe(true)
  })
})
