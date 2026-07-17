import { beforeEach, describe, expect, it, vi } from "vitest"

const { getUserMock, rpcMock, singleMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  rpcMock: vi.fn(),
  singleMock: vi.fn(),
}))

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseBrowserClient: () => ({ auth: { getUser: getUserMock } }),
  getSupabaseEcommerce: () => ({
    from: () => ({ select: () => ({ eq: () => ({ single: singleMock }) }) }),
    rpc: rpcMock,
  }),
}))

import { isCurrentUserAdmin, isCurrentUserAdminOrUnverified } from "@/lib/supabase/permissions-api"

const STORE_OWNER_ID = "3f6bd0a7-2c14-4f0e-8a11-6b0d2c9f4e77"

function profileRole(role: string) {
  singleMock.mockResolvedValue({ data: { role }, error: null })
}

function managesAnyStore(manages: boolean) {
  rpcMock.mockResolvedValue({ data: manages, error: null })
}

describe("isCurrentUserAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserMock.mockResolvedValue({ data: { user: { id: STORE_OWNER_ID } }, error: null })
  })

  it("admits a global 'user' that manages a store", async () => {
    profileRole("user")
    managesAnyStore(true)

    await expect(isCurrentUserAdmin()).resolves.toBe(true)
    expect(rpcMock).toHaveBeenCalledWith("user_manages_any_store", { p_user_id: STORE_OWNER_ID })
  })

  it("keeps out a global 'user' that manages no store", async () => {
    profileRole("user")
    managesAnyStore(false)

    await expect(isCurrentUserAdmin()).resolves.toBe(false)
  })

  it("keeps out the retired global 'admin' role when it manages no store", async () => {
    profileRole("admin")
    managesAnyStore(false)

    await expect(isCurrentUserAdmin()).resolves.toBe(false)
  })

  it("admits a global super_admin that manages no store", async () => {
    profileRole("super_admin")
    managesAnyStore(false)

    await expect(isCurrentUserAdmin()).resolves.toBe(true)
  })

  it("denies a global 'user' when the store membership lookup errors", async () => {
    profileRole("user")
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } })

    await expect(isCurrentUserAdmin()).resolves.toBe(false)
  })
})

describe("isCurrentUserAdminOrUnverified", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserMock.mockResolvedValue({ data: { user: { id: STORE_OWNER_ID } }, error: null })
  })

  it("answers the verified admin check when it concludes", async () => {
    profileRole("user")
    managesAnyStore(false)

    await expect(isCurrentUserAdminOrUnverified()).resolves.toBe(false)
  })

  it("does not deny access when the check never concludes: the server gate decides", async () => {
    getUserMock.mockRejectedValue(new Error("Network timeout"))

    await expect(isCurrentUserAdmin()).rejects.toThrow(/Timeout/)
    await expect(isCurrentUserAdminOrUnverified()).resolves.toBe(true)
  })
})
