import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeSuperAdmin,
  createTenant,
  grantSupportMembership,
  resetOwnerCredential,
  revalidatePath,
} = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  createTenant: vi.fn(),
  grantSupportMembership: vi.fn(),
  resetOwnerCredential: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/stores-admin-api", () => ({ createTenant }))
vi.mock("@/lib/supabase/memberships-api", () => ({ grantSupportMembership, resetOwnerCredential }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  createTenantAction,
  grantSelfSupportAccessAction,
  resetOwnerCredentialAction,
} from "@/app/(platform)/admin/stores/actions"
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

describe("grantSelfSupportAccessAction", () => {
  beforeEach(() => {
    grantSupportMembership.mockResolvedValue({ success: true })
  })

  // D2: the membership is granted to the gate's own userId — the actor can only
  // ever self-assign, never plant a membership for someone else.
  it("grants the support membership to the authenticated super_admin and refreshes the console", async () => {
    const result = await grantSelfSupportAccessAction("store-7")

    expect(result).toEqual({ success: true })
    expect(grantSupportMembership).toHaveBeenCalledWith("store-7", "super-1", SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/stores")
  })

  it("refuses a non-super_admin caller and never touches memberships", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await grantSelfSupportAccessAction("store-7")

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(grantSupportMembership).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("skips revalidation when the grant fails", async () => {
    grantSupportMembership.mockResolvedValue({ success: false, error: "Supabase no configurado" })

    const result = await grantSelfSupportAccessAction("store-7")

    expect(result).toEqual({ success: false, error: "Supabase no configurado" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("resetOwnerCredentialAction", () => {
  const RESET_OK = {
    success: true,
    tempPassword: "temp-secret-24",
    ownerEmail: "duena@correo.com",
    flagWarning: null,
  }

  beforeEach(() => {
    resetOwnerCredential.mockResolvedValue(RESET_OK)
  })

  // The action forwards only the storeId — the domain resolves the owner
  // server-side, so no email or userId a client sends could steer the reset.
  it("resets through the super_admin gate, passing the storeId and the granted client", async () => {
    const result = await resetOwnerCredentialAction("store-7")

    expect(result).toEqual(RESET_OK)
    expect(resetOwnerCredential).toHaveBeenCalledWith("store-7", SERVICE)
  })

  it("refuses a non-super_admin caller and never touches the credential", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await resetOwnerCredentialAction("store-7")

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(resetOwnerCredential).not.toHaveBeenCalled()
  })
})
