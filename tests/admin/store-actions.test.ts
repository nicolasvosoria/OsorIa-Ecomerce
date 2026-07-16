import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeSuperAdmin, createTenant, revalidatePath } = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  createTenant: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/stores-admin-api", () => ({ createTenant }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { createTenantAction } from "@/app/admin/stores/actions"
import type { CreateStoreFormValues } from "@/lib/stores/schemas"

const SERVICE = { marker: "service-client" }
const DENIAL = { error: "Acceso denegado", status: 403 as const }

const input: CreateStoreFormValues = {
  storeName: "QA Store",
  subdomain: "qa-store",
  ownerEmail: "duena@correo.com",
  currencyCode: "COP",
}

beforeEach(() => {
  vi.clearAllMocks()
  authorizeSuperAdmin.mockResolvedValue({ supabase: SERVICE, userId: "super-1" })
  createTenant.mockResolvedValue({ success: true, storeId: "store-1" })
})

describe("createTenantAction", () => {
  it("provisions through the super_admin gate, passing the granted service client", async () => {
    const result = await createTenantAction(input)

    expect(result).toEqual({ success: true, storeId: "store-1" })
    expect(createTenant).toHaveBeenCalledWith(input, SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/stores")
  })

  it("forwards the temporary password of a freshly-created owner", async () => {
    createTenant.mockResolvedValue({
      success: true,
      storeId: "store-2",
      tempPassword: "T3mp-Pass!23",
    })

    const result = await createTenantAction(input)

    expect(result).toMatchObject({ tempPassword: "T3mp-Pass!23" })
  })

  it("refuses a non-super_admin caller and never provisions", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await createTenantAction(input)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(createTenant).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("skips revalidation when provisioning fails", async () => {
    createTenant.mockResolvedValue({ success: false, error: "Ese subdominio ya está en uso." })

    const result = await createTenantAction(input)

    expect(result).toEqual({ success: false, error: "Ese subdominio ya está en uso." })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
