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

function serviceWith(rpc: ReturnType<typeof vi.fn>) {
  return { rpc }
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

    const result = await createTenant(input, serviceWith(rpc))

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
