import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeSuperAdmin, getTenantById, revalidatePath } = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  getTenantById: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/stores-admin-api", () => ({ getTenantById }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  setTenantActive,
  softDeleteTenant,
  updateTenantSettings,
} from "@/app/(platform)/admin/stores/tenant-lifecycle-actions"

const STORE_ID = "store-tenant-9"
const DENIAL = { error: "Acceso denegado", status: 403 as const }

// Chainable stand-in for the service client's `.from(...).update(...).eq(...)`,
// mirroring store-publication-actions.test.ts, so a mutant that touches the
// wrong table, storeId, or payload shows up in the assertions below.
function createSupabaseMock(updateError: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { from, update, eq }
}

const TENANT = {
  id: STORE_ID,
  store_name: "Tienda QA",
  subdomain: "tienda-qa",
  is_active: true,
  is_public: true,
  created_at: null,
  currency_code: "COP",
}

let supabase: ReturnType<typeof createSupabaseMock>

beforeEach(() => {
  vi.clearAllMocks()
  supabase = createSupabaseMock()
  authorizeSuperAdmin.mockResolvedValue({ supabase, userId: "super-1" })
  getTenantById.mockResolvedValue(TENANT)
})

describe("setTenantActive", () => {
  it("flips is_active for the named tenant and revalidates the console and its detail page", async () => {
    const result = await setTenantActive(STORE_ID, false)

    expect(result).toEqual({ success: true })
    expect(supabase.from).toHaveBeenCalledWith("stores")
    expect(supabase.update).toHaveBeenCalledWith({ is_active: false })
    expect(supabase.eq).toHaveBeenCalledWith("id", STORE_ID)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/stores")
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/stores/${STORE_ID}`)
  })

  it("reactivates when asked to", async () => {
    const result = await setTenantActive(STORE_ID, true)

    expect(result).toEqual({ success: true })
    expect(supabase.update).toHaveBeenCalledWith({ is_active: true })
  })

  it("refuses a non-super_admin caller and never touches the DB", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await setTenantActive(STORE_ID, false)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("reports failure and skips revalidation when the update errors", async () => {
    supabase = createSupabaseMock({ message: "boom" })
    authorizeSuperAdmin.mockResolvedValue({ supabase, userId: "super-1" })

    const result = await setTenantActive(STORE_ID, false)

    expect(result).toEqual({ success: false, error: "No se pudo actualizar el estado de la tienda" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("updateTenantSettings", () => {
  const values = { storeName: "Nuevo Nombre", currencyCode: "USD" }

  it("updates store_name and currency_code and revalidates the console and its detail page", async () => {
    const result = await updateTenantSettings(STORE_ID, values)

    expect(result).toEqual({ success: true })
    expect(supabase.from).toHaveBeenCalledWith("stores")
    expect(supabase.update).toHaveBeenCalledWith({
      store_name: "Nuevo Nombre",
      currency_code: "USD",
    })
    expect(supabase.eq).toHaveBeenCalledWith("id", STORE_ID)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/stores")
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/stores/${STORE_ID}`)
  })

  it("refuses a non-super_admin caller and never touches the DB", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await updateTenantSettings(STORE_ID, values)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects an invalid currency code server-side, even past a gated caller, and never touches the DB", async () => {
    const result = await updateTenantSettings(STORE_ID, {
      storeName: "Nuevo Nombre",
      currencyCode: "pesos",
    })

    expect(result.success).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects an empty store name server-side", async () => {
    const result = await updateTenantSettings(STORE_ID, { storeName: "   ", currencyCode: "USD" })

    expect(result.success).toBe(false)
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("reports failure and skips revalidation when the update errors", async () => {
    supabase = createSupabaseMock({ message: "boom" })
    authorizeSuperAdmin.mockResolvedValue({ supabase, userId: "super-1" })

    const result = await updateTenantSettings(STORE_ID, values)

    expect(result).toEqual({ success: false, error: "No se pudo actualizar la tienda" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("softDeleteTenant", () => {
  it("sets deleted_at when the typed subdomain matches, and revalidates the console and its detail page", async () => {
    const result = await softDeleteTenant(STORE_ID, TENANT.subdomain)

    expect(result).toEqual({ success: true })
    expect(getTenantById).toHaveBeenCalledWith(STORE_ID)
    expect(supabase.from).toHaveBeenCalledWith("stores")
    expect(supabase.update).toHaveBeenCalledWith({ deleted_at: expect.any(String) })
    expect(supabase.eq).toHaveBeenCalledWith("id", STORE_ID)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/stores")
    expect(revalidatePath).toHaveBeenCalledWith(`/admin/stores/${STORE_ID}`)
  })

  it("refuses a non-super_admin caller and never fetches or touches the DB", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await softDeleteTenant(STORE_ID, TENANT.subdomain)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(getTenantById).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects a wrong confirmSubdomain server-side, regardless of what the client sent, and never touches the DB", async () => {
    const result = await softDeleteTenant(STORE_ID, "not-the-real-subdomain")

    expect(result).toEqual({ success: false, error: "El subdominio no coincide" })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects a missing confirmSubdomain server-side", async () => {
    const result = await softDeleteTenant(STORE_ID, "")

    expect(result).toEqual({ success: false, error: "El subdominio no coincide" })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("rejects a store that is missing or already deleted, since getTenantById filters deleted_at", async () => {
    getTenantById.mockResolvedValue(null)

    const result = await softDeleteTenant(STORE_ID, TENANT.subdomain)

    expect(result).toEqual({ success: false, error: "Tienda no encontrada" })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("reports failure and skips revalidation when the update errors", async () => {
    supabase = createSupabaseMock({ message: "boom" })
    authorizeSuperAdmin.mockResolvedValue({ supabase, userId: "super-1" })

    const result = await softDeleteTenant(STORE_ID, TENANT.subdomain)

    expect(result).toEqual({ success: false, error: "No se pudo eliminar la tienda" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
