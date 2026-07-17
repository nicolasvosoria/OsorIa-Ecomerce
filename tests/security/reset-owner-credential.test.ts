import { beforeEach, describe, expect, it, vi } from "vitest"

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }))

vi.mock("@supabase/supabase-js", () => ({ createClient }))

import { resetOwnerCredential } from "@/lib/supabase/memberships-api"

const STORE_ID = "store-9"

const OWNER_ROW = {
  user_id: "owner-1",
  granted_by: null,
  user_profiles: { email: "duena@correo.com", first_name: "Ana", last_name: "Pérez" },
  store_user_roles: [{ roles: { role_name: "owner" } }],
}

const ADMIN_ROW = {
  user_id: "admin-1",
  granted_by: null,
  user_profiles: { email: "socio@correo.com", first_name: "Beto", last_name: "Gómez" },
  store_user_roles: [{ roles: { role_name: "admin" } }],
}

// The auth-admin client resetOwnerCredential builds itself (getServiceAuthAdminClient
// keeps the default schema so `.auth.admin` exists — the Plan 9 gotcha).
function mockAuthAdmin(updateUserById: ReturnType<typeof vi.fn>) {
  createClient.mockReturnValue({ auth: { admin: { updateUserById } } })
}

// The ecommerce service the caller passes in: `store_users` feeds the owner
// resolution, `user_profiles` receives the must_change_password write.
function mockService(memberRows: unknown[], flagError: { message: string } | null = null) {
  const membersEq = vi.fn().mockResolvedValue({ data: memberRows, error: null })
  const flagEq = vi.fn().mockResolvedValue({ error: flagError })
  const profileUpdate = vi.fn(() => ({ eq: flagEq }))
  const from = vi.fn((table: string) => {
    if (table === "store_users") {
      return { select: vi.fn(() => ({ eq: membersEq })) }
    }
    if (table === "user_profiles") {
      return { update: profileUpdate }
    }
    throw new Error(`unexpected table ${table}`)
  })

  return { service: { from }, membersEq, profileUpdate, flagEq }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key"
})

describe("resetOwnerCredential (D7 support reset)", () => {
  it("resets the single owner: temp password via auth admin, flag re-armed, password returned once and never logged", async () => {
    const consoleSpies = (["log", "info", "warn", "error"] as const).map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    )
    const updateUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null })
    mockAuthAdmin(updateUserById)
    const { service, membersEq, profileUpdate, flagEq } = mockService([ADMIN_ROW, OWNER_ROW])

    const result = await resetOwnerCredential(STORE_ID, service)

    expect(membersEq).toHaveBeenCalledWith("store_id", STORE_ID)
    expect(updateUserById).toHaveBeenCalledTimes(1)
    const [targetUserId, attributes] = updateUserById.mock.calls[0]
    expect(targetUserId).toBe("owner-1")
    expect(typeof attributes.password).toBe("string")
    expect(attributes.password.length).toBeGreaterThanOrEqual(6)

    expect(profileUpdate).toHaveBeenCalledWith({ must_change_password: true })
    expect(flagEq).toHaveBeenCalledWith("id", "owner-1")
    expect(result).toEqual({
      success: true,
      tempPassword: attributes.password,
      ownerEmail: "duena@correo.com",
      flagWarning: null,
    })

    const loggedOutput = consoleSpies.flatMap((spy) => spy.mock.calls.flat()).map(String)
    expect(loggedOutput.some((entry) => entry.includes(attributes.password))).toBe(false)
    consoleSpies.forEach((spy) => spy.mockRestore())
  })

  it("refuses a store with no owner, touching neither the auth account nor the profile", async () => {
    const updateUserById = vi.fn()
    mockAuthAdmin(updateUserById)
    const { service, profileUpdate } = mockService([ADMIN_ROW])

    const result = await resetOwnerCredential(STORE_ID, service)

    expect(result).toEqual({
      success: false,
      error: "La tienda no tiene ningún miembro con rol de dueño; no hay credencial que restablecer.",
    })
    expect(updateUserById).not.toHaveBeenCalled()
    expect(profileUpdate).not.toHaveBeenCalled()
  })

  it("refuses a store with several owners instead of guessing which one", async () => {
    const updateUserById = vi.fn()
    mockAuthAdmin(updateUserById)
    const secondOwner = {
      ...OWNER_ROW,
      user_id: "owner-2",
      user_profiles: { ...OWNER_ROW.user_profiles, email: "otra@correo.com" },
    }
    const { service, profileUpdate } = mockService([OWNER_ROW, secondOwner])

    const result = await resetOwnerCredential(STORE_ID, service)

    expect(result).toEqual({
      success: false,
      error: "La tienda tiene más de un dueño y esta acción solo admite uno.",
    })
    expect(updateUserById).not.toHaveBeenCalled()
    expect(profileUpdate).not.toHaveBeenCalled()
  })

  // Ordering guarantee: a failed password update changes nothing, so the flag is
  // never armed for a credential that never changed.
  it("surfaces a failed auth update and never writes the must-change flag", async () => {
    const updateUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: null }, error: { message: "boom" } })
    mockAuthAdmin(updateUserById)
    const { service, profileUpdate } = mockService([OWNER_ROW])

    const result = await resetOwnerCredential(STORE_ID, service)

    expect(result).toEqual({
      success: false,
      error: "No se pudo restablecer la contraseña: boom",
    })
    expect(profileUpdate).not.toHaveBeenCalled()
  })

  // The half-applied case: the password DID change, so the response must still
  // hand over the temp password and say so — dropping it would lock the owner
  // behind a credential nobody knows.
  it("still returns the temp password with a warning when the flag write fails after the password changed", async () => {
    const updateUserById = vi
      .fn()
      .mockResolvedValue({ data: { user: { id: "owner-1" } }, error: null })
    mockAuthAdmin(updateUserById)
    const { service } = mockService([OWNER_ROW], { message: "permission denied" })

    const result = await resetOwnerCredential(STORE_ID, service)

    expect(result).toMatchObject({
      success: true,
      ownerEmail: "duena@correo.com",
      tempPassword: updateUserById.mock.calls[0][1].password,
    })
    if (!result.success) throw new Error("expected success")
    expect(result.flagWarning).toContain("sí se restableció")
    expect(result.flagWarning).toContain("permission denied")
  })
})
