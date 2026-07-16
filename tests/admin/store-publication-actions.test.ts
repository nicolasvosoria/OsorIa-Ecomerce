import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, authorizeSuperAdmin, revalidatePath } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  authorizeSuperAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({
  authorizeActiveStoreAdmin,
  authorizeSuperAdmin,
}))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  setActiveStorePublication,
  setTenantPublication,
} from "@/app/admin/actions/store-publication"

const ACTIVE_STORE_ID = "store-active-1"
const OTHER_TENANT_ID = "store-tenant-9"
const DENIAL = { error: "Acceso denegado", status: 403 as const }

// Chainable stand-in for the service client's `.from(...).update(...).eq(...)`,
// recording every call so a mutant that queries the wrong table, storeId, or
// payload shows up in the assertions below.
function createSupabaseMock(updateError: unknown = null) {
  const eq = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  return { from, update, eq }
}

describe("setActiveStorePublication (dueño gate)", () => {
  let supabase: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createSupabaseMock()
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase,
      storeId: ACTIVE_STORE_ID,
      userId: "owner-1",
    })
  })

  it("publishes the ACTIVE store resolved by the gate, never a client-supplied id", async () => {
    const result = await setActiveStorePublication(true)

    expect(result).toEqual({ success: true })
    expect(supabase.from).toHaveBeenCalledWith("stores")
    expect(supabase.update).toHaveBeenCalledWith({ is_public: true })
    expect(supabase.eq).toHaveBeenCalledWith("id", ACTIVE_STORE_ID)
    expect(revalidatePath).toHaveBeenCalledWith("/admin", "layout")
  })

  it("unpublishes when asked to", async () => {
    const result = await setActiveStorePublication(false)

    expect(result).toEqual({ success: true })
    expect(supabase.update).toHaveBeenCalledWith({ is_public: false })
  })

  it("refuses when the dueño does not manage the active store, and never touches the DB", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue(DENIAL)

    const result = await setActiveStorePublication(true)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("reports failure and skips revalidation when the update errors", async () => {
    supabase = createSupabaseMock({ message: "boom" })
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase,
      storeId: ACTIVE_STORE_ID,
      userId: "owner-1",
    })

    const result = await setActiveStorePublication(true)

    expect(result).toEqual({
      success: false,
      error: "No se pudo actualizar la publicación de la tienda",
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe("setTenantPublication (super_admin gate)", () => {
  let supabase: ReturnType<typeof createSupabaseMock>

  beforeEach(() => {
    vi.clearAllMocks()
    supabase = createSupabaseMock()
    authorizeSuperAdmin.mockResolvedValue({ supabase, userId: "super-1" })
  })

  it("publishes the tenant explicitly named by the caller, via the super_admin gate", async () => {
    const result = await setTenantPublication(OTHER_TENANT_ID, true)

    expect(result).toEqual({ success: true })
    expect(authorizeSuperAdmin).toHaveBeenCalledTimes(1)
    expect(authorizeActiveStoreAdmin).not.toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith("stores")
    expect(supabase.update).toHaveBeenCalledWith({ is_public: true })
    expect(supabase.eq).toHaveBeenCalledWith("id", OTHER_TENANT_ID)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/stores")
  })

  it("refuses a non-super_admin caller and never touches the DB", async () => {
    authorizeSuperAdmin.mockResolvedValue(DENIAL)

    const result = await setTenantPublication(OTHER_TENANT_ID, true)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(supabase.from).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
