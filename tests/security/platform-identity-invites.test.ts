import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getServiceAuthAdminClient,
  mintAuthIntent,
  renderEmail,
  createVerificationToken,
} = vi.hoisted(() => ({
  getServiceAuthAdminClient: vi.fn(),
  mintAuthIntent: vi.fn(),
  renderEmail: vi.fn(),
  createVerificationToken: vi.fn(),
}))

vi.mock("@/lib/supabase/service-client", () => ({ getServiceAuthAdminClient }))
vi.mock("@/lib/auth/auth-intents", () => ({ mintAuthIntent }))
vi.mock("@/lib/email/render", () => ({ renderEmail }))
vi.mock("@/lib/security/verification-token", () => ({ createVerificationToken }))

import {
  clearInvitedPendingPassword,
  deleteInvitedIdentity,
  inviteNewIdentity,
  mintPendingMembershipInvite,
  provisionOrCompensate,
  resolveAuthIdentityByEmail,
} from "@/lib/auth/platform-identity-invites"

function serviceWith(rpcResult: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(rpcResult) }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
})

describe("resolveAuthIdentityByEmail", () => {
  it("resolves an existing identity's id", async () => {
    const service = serviceWith({ data: "existing-uid", error: null })

    await expect(resolveAuthIdentityByEmail(service, "socio@correo.com")).resolves.toEqual({
      exists: true,
      userId: "existing-uid",
    })
    expect(service.rpc).toHaveBeenCalledWith("find_auth_user_id_by_email", { p_email: "socio@correo.com" })
  })

  it("reports no identity for an unknown email", async () => {
    const service = serviceWith({ data: null, error: null })

    await expect(resolveAuthIdentityByEmail(service, "nadie@correo.com")).resolves.toEqual({ exists: false })
  })

  it("throws instead of silently treating a lookup failure as unknown", async () => {
    const service = serviceWith({ data: null, error: { message: "permission denied" } })

    await expect(resolveAuthIdentityByEmail(service, "x@correo.com")).rejects.toThrow(/permission denied/)
  })
})

describe("inviteNewIdentity (D20/D22/D25)", () => {
  function mockAuthAdmin(overrides: Partial<{ inviteUserByEmail: any; getUserById: any; updateUserById: any; deleteUser: any }> = {}) {
    const admin = {
      inviteUserByEmail: vi.fn().mockResolvedValue({ data: { user: { id: "new-uid" } }, error: null }),
      getUserById: vi.fn().mockResolvedValue({ data: { user: { app_metadata: {} } }, error: null }),
      updateUserById: vi.fn().mockResolvedValue({ error: null }),
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
      ...overrides,
    }
    getServiceAuthAdminClient.mockReturnValue({ auth: { admin } })
    return admin
  }

  const input = { storeId: "store-1", subdomain: "cumbre-dorada", email: "nuevo@correo.com", purpose: "new_user_invite" as const }

  beforeEach(() => {
    mintAuthIntent.mockResolvedValue("intent-token-123")
  })

  it("gates on D25's reused limiter BEFORE ever touching auth.users", async () => {
    const service = serviceWith({ data: false, error: null })
    const admin = mockAuthAdmin()

    const result = await inviteNewIdentity(service, input)

    expect(result).toEqual({ outcome: "rate_limited" })
    expect(service.rpc).toHaveBeenCalledWith(
      "check_and_record_send_attempt",
      { p_store_id: "store-1", p_purpose: "new_user_invite", p_recipient_email: "nuevo@correo.com" },
    )
    expect(admin.inviteUserByEmail).not.toHaveBeenCalled()
  })

  // C2/D24: a genuine RPC failure must NOT collapse into the same
  // rate_limited outcome as a busy limiter -- that reads to an operator as
  // "wait a minute" when the limiter itself is actually down. Still fails
  // closed (never touches auth.users), but with its own distinct outcome
  // logged distinctly for the operator; every consumer maps it back to the
  // same user copy as rate_limited (stores-admin-api.test.ts asserts that).
  it("fails closed with a distinct outcome, not rate_limited, when the limiter RPC itself errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const service = serviceWith({ data: null, error: { message: "permission denied" } })
    const admin = mockAuthAdmin()

    const result = await inviteNewIdentity(service, input)

    expect(result).toEqual({ outcome: "rate_limit_check_failed" })
    expect(admin.inviteUserByEmail).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(consoleError.mock.calls[0][0])
    expect(logged).toMatchObject({ level: "error", storeId: "store-1", purpose: "new_user_invite" })
    consoleError.mockRestore()
  })

  it("mints the intent, invites via GoTrue with a store-subdomain redirect carrying it, and flags app_metadata", async () => {
    const service = serviceWith({ data: true, error: null })
    const admin = mockAuthAdmin()

    const result = await inviteNewIdentity(service, input)

    expect(result).toEqual({ outcome: "invited", userId: "new-uid" })
    expect(mintAuthIntent).toHaveBeenCalledWith(service, {
      storeId: "store-1",
      purpose: "new_user_invite",
      email: "nuevo@correo.com",
    })

    const [email, options] = admin.inviteUserByEmail.mock.calls[0]
    expect(email).toBe("nuevo@correo.com")
    const redirectTo = new URL(options.redirectTo)
    expect(redirectTo.origin).toBe("https://cumbre-dorada.osoria.help")
    expect(redirectTo.pathname).toBe("/auth/accept-invite")
    expect(redirectTo.searchParams.get("intent")).toBe("intent-token-123")

    expect(admin.updateUserById).toHaveBeenCalledWith("new-uid", {
      app_metadata: { invited_pending_password: true },
    })
  })

  it("preserves any app_metadata a sibling app already set on this shared-pool identity", async () => {
    const service = serviceWith({ data: true, error: null })
    const admin = mockAuthAdmin({
      getUserById: vi.fn().mockResolvedValue({ data: { user: { app_metadata: { other_app_role: "editor" } } }, error: null }),
    })

    await inviteNewIdentity(service, input)

    expect(admin.updateUserById).toHaveBeenCalledWith("new-uid", {
      app_metadata: { other_app_role: "editor", invited_pending_password: true },
    })
  })

  it("reports email_exists as its own outcome without treating it as a generic error", async () => {
    const service = serviceWith({ data: true, error: null })
    mockAuthAdmin({
      inviteUserByEmail: vi.fn().mockResolvedValue({ data: { user: null }, error: { code: "email_exists", message: "exists" } }),
    })

    await expect(inviteNewIdentity(service, input)).resolves.toEqual({ outcome: "email_exists" })
  })

  it("surfaces any other invite failure as a generic error", async () => {
    const service = serviceWith({ data: true, error: null })
    mockAuthAdmin({
      inviteUserByEmail: vi.fn().mockResolvedValue({ data: { user: null }, error: { code: "unexpected_failure", message: "boom" } }),
    })

    const result = await inviteNewIdentity(service, input)
    expect(result.outcome).toBe("error")
  })

  // D20's compensation: this identity was JUST created by THIS call, so a
  // failure finishing its own setup (the app_metadata write) must revert it
  // -- never leave an unflagged, unrestricted identity behind.
  it("compensates by deleting the identity if flagging app_metadata fails", async () => {
    const service = serviceWith({ data: true, error: null })
    const admin = mockAuthAdmin({ updateUserById: vi.fn().mockResolvedValue({ error: { message: "boom" } }) })

    const result = await inviteNewIdentity(service, input)

    expect(result.outcome).toBe("error")
    expect(admin.deleteUser).toHaveBeenCalledWith("new-uid")
  })
})

describe("deleteInvitedIdentity / provisionOrCompensate (D20 compensation)", () => {
  function mockAuthAdmin(deleteUser = vi.fn().mockResolvedValue({ error: null })) {
    getServiceAuthAdminClient.mockReturnValue({ auth: { admin: { deleteUser } } })
    return deleteUser
  }

  it("deletes exactly the identity it is given", async () => {
    const deleteUser = mockAuthAdmin()

    await deleteInvitedIdentity("new-uid")

    expect(deleteUser).toHaveBeenCalledWith("new-uid")
  })

  it("logs, never throws, when the compensating delete itself fails", async () => {
    mockAuthAdmin(vi.fn().mockResolvedValue({ error: { message: "boom" } }))
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await expect(deleteInvitedIdentity("new-uid")).resolves.toBeUndefined()

    errorSpy.mockRestore()
  })

  it("passes through a successful provision untouched, never compensating", async () => {
    const deleteUser = mockAuthAdmin()

    const result = await provisionOrCompensate("new-uid", async () => "provisioned")

    expect(result).toBe("provisioned")
    expect(deleteUser).not.toHaveBeenCalled()
  })

  // The exact "both directions" verify criterion: a failure AFTER a NEW
  // identity was created compensates it, and (the sibling describe blocks
  // above/below) an identity that already existed is never even passed here.
  it("compensates the exact identity and rethrows when provisioning fails", async () => {
    const deleteUser = mockAuthAdmin()
    const failure = new Error("profile insert failed")

    await expect(
      provisionOrCompensate("new-uid", async () => {
        throw failure
      }),
    ).rejects.toThrow(failure)
    expect(deleteUser).toHaveBeenCalledWith("new-uid")
  })
})

describe("clearInvitedPendingPassword (D22 completion)", () => {
  it("merges the flag to false, preserving any other app_metadata key", async () => {
    const updateUserById = vi.fn().mockResolvedValue({ error: null })
    getServiceAuthAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { app_metadata: { invited_pending_password: true, other_app_role: "editor" } } },
            error: null,
          }),
          updateUserById,
        },
      },
    })

    await expect(clearInvitedPendingPassword("uid-1")).resolves.toBe(true)
    expect(updateUserById).toHaveBeenCalledWith("uid-1", {
      app_metadata: { invited_pending_password: false, other_app_role: "editor" },
    })
  })

  it("reports failure instead of silently leaving the session restricted", async () => {
    getServiceAuthAdminClient.mockReturnValue({
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({ data: { user: { app_metadata: {} } }, error: null }),
          updateUserById: vi.fn().mockResolvedValue({ error: { message: "boom" } }),
        },
      },
    })

    await expect(clearInvitedPendingPassword("uid-1")).resolves.toBe(false)
  })
})

describe("mintPendingMembershipInvite (D21)", () => {
  const branding = {
    displayName: "Cumbre Dorada Café",
    validatedSubdomain: "cumbre-dorada",
    primaryColor: "#5daba8",
    commercialAddress: "Bogotá, Colombia",
  }

  beforeEach(() => {
    createVerificationToken.mockReturnValue({ token: "plaintext-token", tokenHash: "hashed-token" })
    renderEmail.mockResolvedValue({ subject: "Te invitaron", html: "<p>h</p>", text: "t" })
  })

  it("renders the membership-acceptance email and calls the RPC with the hashed token, never the plaintext", async () => {
    const service = serviceWith({ data: { ok: true }, error: null })

    const result = await mintPendingMembershipInvite(service, {
      actorUserId: "owner-1",
      storeId: "store-1",
      intendedUserId: "member-1",
      email: "socio@correo.com",
      roleName: "admin",
      branding,
    })

    expect(result).toEqual({ outcome: "invited" })
    expect(renderEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "membership-acceptance",
        data: expect.objectContaining({ actionPath: "/auth/accept-membership?token=plaintext-token" }),
      }),
    )
    expect(service.rpc).toHaveBeenCalledWith(
      "request_membership_invite",
      expect.objectContaining({
        p_actor_user_id: "owner-1",
        p_store_id: "store-1",
        p_intended_user_id: "member-1",
        p_email: "socio@correo.com",
        p_role_name: "admin",
        p_token_hash: "hashed-token",
      }),
    )
    const [, args] = service.rpc.mock.calls[0]
    expect(args.p_idempotency_key).not.toContain("plaintext-token")
  })

  it("maps a rate_limited RPC reason without inventing a second limiter", async () => {
    const service = serviceWith({ data: { ok: false, reason: "rate_limited" }, error: null })

    const result = await mintPendingMembershipInvite(service, {
      actorUserId: "owner-1",
      storeId: "store-1",
      intendedUserId: "member-1",
      email: "socio@correo.com",
      roleName: "admin",
      branding,
    })

    expect(result).toEqual({ outcome: "rate_limited" })
  })

  // D24, parallel to inviteNewIdentity's own fix: request_membership_invite's
  // OWN internal check_and_record_send_attempt call can fail on its own
  // terms (the migration catches it and returns this reason instead of
  // letting it unwind as a raw RPC error) -- must read as its own distinct,
  // logged outcome, never the generic {outcome:"error"} bucket every
  // consumer would otherwise map to a differently-worded message.
  it("fails closed with a distinct outcome, not a generic error, when request_membership_invite's own limiter check fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    const service = serviceWith({
      data: { ok: false, reason: "rate_limit_check_failed", detail: "lock timeout" },
      error: null,
    })

    const result = await mintPendingMembershipInvite(service, {
      actorUserId: "owner-1",
      storeId: "store-1",
      intendedUserId: "member-1",
      email: "socio@correo.com",
      roleName: "admin",
      branding,
    })

    expect(result).toEqual({ outcome: "rate_limit_check_failed" })
    expect(consoleError).toHaveBeenCalledTimes(1)
    const logged = JSON.parse(consoleError.mock.calls[0][0])
    expect(logged).toMatchObject({
      level: "error",
      storeId: "store-1",
      intendedUserId: "member-1",
      error: "lock timeout",
    })
    consoleError.mockRestore()
  })
})
