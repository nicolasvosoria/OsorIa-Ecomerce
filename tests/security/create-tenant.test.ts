import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  resolveAuthIdentityByEmail,
  inviteNewIdentity,
  mintPendingMembershipInvite,
  provisionOrCompensate,
  insertInvitedProfile,
  ensureStoreUser,
  resolveStoreRoleId,
  assignSingleRole,
  loadStoreIdentity,
  toTenantEmailBranding,
} = vi.hoisted(() => ({
  resolveAuthIdentityByEmail: vi.fn(),
  inviteNewIdentity: vi.fn(),
  mintPendingMembershipInvite: vi.fn(),
  provisionOrCompensate: vi.fn(),
  insertInvitedProfile: vi.fn(),
  ensureStoreUser: vi.fn(),
  resolveStoreRoleId: vi.fn(),
  assignSingleRole: vi.fn(),
  loadStoreIdentity: vi.fn(),
  toTenantEmailBranding: vi.fn(),
}))

vi.mock("@/lib/auth/platform-identity-invites", () => ({
  resolveAuthIdentityByEmail,
  inviteNewIdentity,
  mintPendingMembershipInvite,
  provisionOrCompensate,
}))
vi.mock("@/lib/supabase/memberships-api", () => ({
  insertInvitedProfile,
  ensureStoreUser,
  resolveStoreRoleId,
  assignSingleRole,
}))
vi.mock("@/lib/supabase/store-identity-api", () => ({ loadStoreIdentity, toTenantEmailBranding }))

import { createTenant } from "@/lib/supabase/stores-admin-api"
import type { CreateStoreFormValues } from "@/lib/stores/schemas"

const ACTOR_ID = "super-1"
const input: CreateStoreFormValues = {
  storeName: "QA Store",
  subdomain: "qa-store",
  ownerEmail: "duena@correo.com",
  currencyCode: "COP",
  ownerFirstName: "Ana",
  ownerLastName: "Pérez",
}

function serviceWith(rpc: ReturnType<typeof vi.fn>, deleteResult: { error: unknown } = { error: null }) {
  const eq = vi.fn().mockResolvedValue(deleteResult)
  const del = vi.fn(() => ({ eq }))
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn(() => ({ eq: updateEq }))
  const from = vi.fn(() => ({ delete: del, update }))
  return { rpc, from, del, deleteEq: eq, update, updateEq }
}

beforeEach(() => {
  vi.clearAllMocks()
  // D20's happy-path default: provisionOrCompensate just runs the provision
  // callback, so these tests exercise createTenant's OWN assembly of it --
  // compensation itself is proven in platform-identity-invites.test.ts.
  provisionOrCompensate.mockImplementation((_userId: string, provision: () => Promise<unknown>) => provision())
  insertInvitedProfile.mockResolvedValue(undefined)
  ensureStoreUser.mockResolvedValue("store-user-1")
  resolveStoreRoleId.mockResolvedValue("role-owner-1")
  assignSingleRole.mockResolvedValue(undefined)
  loadStoreIdentity.mockResolvedValue({ subdomain: "qa-store" })
  toTenantEmailBranding.mockReturnValue({ displayName: "QA Store", validatedSubdomain: "qa-store", primaryColor: "", commercialAddress: "" })
})

describe("createTenant: store shell first (D20's circular-dependency fix)", () => {
  it("creates the store with a NULL owner before resolving the owner identity at all", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: false })
    inviteNewIdentity.mockResolvedValue({ outcome: "invited", userId: "new-uid" })

    await createTenant(input, ACTOR_ID, service)

    expect(rpc).toHaveBeenCalledWith("provision_store", {
      p_subdomain: "qa-store",
      p_store_name: "QA Store",
      p_owner_user_id: null,
      p_currency_code: "COP",
    })
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(resolveAuthIdentityByEmail.mock.invocationCallOrder[0])
  })

  it("maps a subdomain collision at shell creation to a readable message and never resolves an owner", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: 'duplicate key value violates unique constraint "stores_subdomain_key"' },
    })
    const service = serviceWith(rpc)

    const result = await createTenant(input, ACTOR_ID, service)

    expect(result).toEqual({ success: false, error: "Ese subdominio ya está en uso. Elige otro." })
    expect(resolveAuthIdentityByEmail).not.toHaveBeenCalled()
  })
})

describe("createTenant: D20 native invite for an unknown owner", () => {
  it("invites the owner natively, provisions ownership, and records the signup origin", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: false })
    inviteNewIdentity.mockResolvedValue({ outcome: "invited", userId: "new-uid" })

    const result = await createTenant(input, ACTOR_ID, service)

    expect(result).toEqual({ success: true, storeId: "store-1" })
    expect(inviteNewIdentity).toHaveBeenCalledWith(service, {
      storeId: "store-1",
      subdomain: "qa-store",
      email: "duena@correo.com",
      purpose: "owner_invite",
      names: { firstName: "Ana", lastName: "Pérez" },
    })
    expect(insertInvitedProfile).toHaveBeenCalledWith(service, "new-uid", "duena@correo.com", {
      firstName: "Ana",
      lastName: "Pérez",
    })
    expect(ensureStoreUser).toHaveBeenCalledWith(service, "store-1", "new-uid")
    expect(resolveStoreRoleId).toHaveBeenCalledWith(service, "store-1", "owner")
    expect(assignSingleRole).toHaveBeenCalledWith(service, "store-user-1", "role-owner-1")
    expect(service.from).toHaveBeenCalledWith("user_profiles")
    expect(service.update).toHaveBeenCalledWith({ signup_store_id: "store-1" })
    expect(service.updateEq).toHaveBeenCalledWith("id", "new-uid")
    expect(service.del).not.toHaveBeenCalled()
  })

  it("deletes the store shell (never the identity itself here) when the invite send is rate-limited", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: false })
    inviteNewIdentity.mockResolvedValue({ outcome: "rate_limited" })

    const result = await createTenant(input, ACTOR_ID, service)

    expect(result.success).toBe(false)
    expect(service.del).toHaveBeenCalledWith()
    expect(service.deleteEq).toHaveBeenCalledWith("id", "store-1")
    expect(insertInvitedProfile).not.toHaveBeenCalled()
  })

  // C2/D24: a genuine limiter-check failure must read to the caller EXACTLY
  // like a real rate limit -- inviteNewIdentity gives it its own outcome so
  // an operator's logs can tell them apart, but nothing downstream may turn
  // that into a new signal.
  it("gives a limiter-check failure the exact same response as a genuine rate limit", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: false })

    inviteNewIdentity.mockResolvedValue({ outcome: "rate_limited" })
    const rateLimited = await createTenant(input, ACTOR_ID, service)

    inviteNewIdentity.mockResolvedValue({ outcome: "rate_limit_check_failed" })
    const checkFailed = await createTenant(input, ACTOR_ID, service)

    expect(checkFailed).toEqual(rateLimited)
  })

  // The compensation verify criterion's "new identity" direction, at the
  // createTenant assembly level: provisionOrCompensate is handed the
  // freshly-invited userId, never a pre-existing one.
  it("hands provisionOrCompensate the freshly invited userId when provisioning fails", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: false })
    inviteNewIdentity.mockResolvedValue({ outcome: "invited", userId: "new-uid" })
    insertInvitedProfile.mockRejectedValue(new Error("profile insert failed"))

    const result = await createTenant(input, ACTOR_ID, service)

    expect(result).toEqual({ success: false, error: "profile insert failed" })
    expect(provisionOrCompensate).toHaveBeenCalledWith("new-uid", expect.any(Function))
    // The store this SAME request just created is also cleaned up: nothing
    // to hand off to anyone once ownership provisioning failed entirely.
    expect(service.del).toHaveBeenCalledWith()
    expect(service.deleteEq).toHaveBeenCalledWith("id", "store-1")
  })
})

describe("createTenant: D21 pending acceptance for an owner who already exists", () => {
  it("mints a pending membership invite instead of granting ownership immediately", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: true, userId: "existing-uid" })
    mintPendingMembershipInvite.mockResolvedValue({ outcome: "invited" })

    const result = await createTenant(input, ACTOR_ID, service)

    expect(result).toEqual({ success: true, storeId: "store-1" })
    expect(loadStoreIdentity).toHaveBeenCalledWith(service, "store-1")
    expect(mintPendingMembershipInvite).toHaveBeenCalledWith(service, expect.objectContaining({
      actorUserId: ACTOR_ID,
      storeId: "store-1",
      intendedUserId: "existing-uid",
      email: "duena@correo.com",
      roleName: "owner",
    }))
    // Never an immediate grant (D21): no membership/role writes happen here.
    expect(insertInvitedProfile).not.toHaveBeenCalled()
    expect(ensureStoreUser).not.toHaveBeenCalled()
    expect(inviteNewIdentity).not.toHaveBeenCalled()
    expect(service.del).not.toHaveBeenCalled()
  })

  it("deletes the store shell when the pending invite cannot be sent", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: true, userId: "existing-uid" })
    mintPendingMembershipInvite.mockResolvedValue({ outcome: "not_authorized" })

    const result = await createTenant(input, ACTOR_ID, service)

    expect(result.success).toBe(false)
    expect(service.del).toHaveBeenCalledWith()
    expect(service.deleteEq).toHaveBeenCalledWith("id", "store-1")
  })

  // D24, same shape as the D20 native-invite branch's own byte-identical
  // assertion above: request_membership_invite's internal limiter-check
  // failure must read to this caller EXACTLY like a genuine rate limit --
  // mintPendingMembershipInvite gives it its own outcome so an operator's
  // logs can tell them apart, but nothing downstream may turn that into a
  // new, differently-worded signal.
  it("gives a pending-invite limiter-check failure the exact same response as a genuine rate limit", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: true, userId: "existing-uid" })

    mintPendingMembershipInvite.mockResolvedValue({ outcome: "rate_limited" })
    const rateLimited = await createTenant(input, ACTOR_ID, service)

    mintPendingMembershipInvite.mockResolvedValue({ outcome: "rate_limit_check_failed" })
    const checkFailed = await createTenant(input, ACTOR_ID, service)

    expect(checkFailed).toEqual(rateLimited)
  })
})
