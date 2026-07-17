import { beforeEach, describe, expect, it, vi } from "vitest"

const { ensurePlatformUserByEmail } = vi.hoisted(() => ({
  ensurePlatformUserByEmail: vi.fn(),
}))

vi.mock("@/lib/supabase/memberships-api", () => ({ ensurePlatformUserByEmail }))

import { createTenant } from "@/lib/supabase/stores-admin-api"
import type { CreateStoreFormValues } from "@/lib/stores/schemas"

const input: CreateStoreFormValues = {
  storeName: "QA Store",
  subdomain: "qa-store",
  ownerEmail: "duena@correo.com",
  currencyCode: "COP",
  ownerFirstName: "Ana",
  ownerLastName: "Pérez",
}

function serviceWith(rpc: ReturnType<typeof vi.fn>, from?: any) {
  return from ? { rpc, from } : { rpc }
}

// The signup_store_id write (D8) runs through service.from(...).update(...).eq(...);
// only the tests exercising a freshly-minted owner need this chain mocked.
function updateChain(result: { error: unknown } = { error: null }) {
  const eq = vi.fn().mockResolvedValue(result)
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { from, update, eq }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createTenant provisioning order", () => {
  it("resolves the owner identity BEFORE provisioning, passing that userId to the RPC", async () => {
    ensurePlatformUserByEmail.mockResolvedValue({ userId: "owner-uid", created: false })
    const rpc = vi.fn().mockResolvedValue({ data: "store-1", error: null })
    const service = serviceWith(rpc)

    const result = await createTenant(input, service)

    expect(result).toEqual({ success: true, storeId: "store-1" })
    expect(ensurePlatformUserByEmail).toHaveBeenCalledWith("duena@correo.com", service, {
      firstName: "Ana",
      lastName: "Pérez",
    })
    expect(rpc).toHaveBeenCalledWith("provision_store", {
      p_subdomain: "qa-store",
      p_store_name: "QA Store",
      p_owner_user_id: "owner-uid",
      p_currency_code: "COP",
    })
    expect(ensurePlatformUserByEmail.mock.invocationCallOrder[0]).toBeLessThan(
      rpc.mock.invocationCallOrder[0],
    )
  })

  it("returns the temporary password when the owner was freshly minted", async () => {
    ensurePlatformUserByEmail.mockResolvedValue({
      userId: "new-uid",
      created: true,
      tempPassword: "temp-secret-24-chars",
    })
    const rpc = vi.fn().mockResolvedValue({ data: "store-2", error: null })
    const { from } = updateChain()

    const result = await createTenant(input, serviceWith(rpc, from))

    expect(result).toEqual({
      success: true,
      storeId: "store-2",
      tempPassword: "temp-secret-24-chars",
    })
  })

  it("does NOT provision when the owner identity cannot be resolved (foreign account)", async () => {
    ensurePlatformUserByEmail.mockRejectedValue(
      new Error("Ese correo ya pertenece a una cuenta de la plataforma pero no del ecommerce."),
    )
    const rpc = vi.fn()

    const result = await createTenant(input, serviceWith(rpc))

    expect(result).toEqual({
      success: false,
      error: "Ese correo ya pertenece a una cuenta de la plataforma pero no del ecommerce.",
    })
    expect(rpc).not.toHaveBeenCalled()
  })

  it("maps a subdomain unique violation to a readable message", async () => {
    ensurePlatformUserByEmail.mockResolvedValue({ userId: "owner-uid", created: false })
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "stores_subdomain_key"',
      },
    })

    const result = await createTenant(input, serviceWith(rpc))

    expect(result).toEqual({ success: false, error: "Ese subdominio ya está en uso. Elige otro." })
  })

  it("does not mask a non-collision provisioning error as a subdomain conflict", async () => {
    ensurePlatformUserByEmail.mockResolvedValue({ userId: "owner-uid", created: false })
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42501", message: "permission denied for function provision_store" },
    })

    const result = await createTenant(input, serviceWith(rpc))

    expect(result).toEqual({
      success: false,
      error: "permission denied for function provision_store",
    })
  })
})

describe("createTenant owner signup origin (D8)", () => {
  it("records the provisioned store as signup_store_id for a freshly-minted owner", async () => {
    ensurePlatformUserByEmail.mockResolvedValue({
      userId: "new-uid",
      created: true,
      tempPassword: "temp-secret-24-chars",
    })
    const rpc = vi.fn().mockResolvedValue({ data: "store-3", error: null })
    const { from, update, eq } = updateChain()

    await createTenant(input, serviceWith(rpc, from))

    expect(from).toHaveBeenCalledWith("user_profiles")
    expect(update).toHaveBeenCalledWith({ signup_store_id: "store-3" })
    expect(eq).toHaveBeenCalledWith("id", "new-uid")
  })

  it("leaves an existing owner's signup_store_id untouched", async () => {
    ensurePlatformUserByEmail.mockResolvedValue({ userId: "owner-uid", created: false })
    const rpc = vi.fn().mockResolvedValue({ data: "store-4", error: null })
    const from = vi.fn()

    const result = await createTenant(input, serviceWith(rpc, from))

    expect(result).toEqual({ success: true, storeId: "store-4" })
    expect(from).not.toHaveBeenCalled()
  })

  it("still returns success when the best-effort origin write fails", async () => {
    ensurePlatformUserByEmail.mockResolvedValue({
      userId: "new-uid",
      created: true,
      tempPassword: "temp-secret-24-chars",
    })
    const rpc = vi.fn().mockResolvedValue({ data: "store-5", error: null })
    const { from } = updateChain({ error: { message: "permission denied" } })

    const result = await createTenant(input, serviceWith(rpc, from))

    expect(result).toEqual({
      success: true,
      storeId: "store-5",
      tempPassword: "temp-secret-24-chars",
    })
  })
})
