import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, saveShippingMode, revalidatePath } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  saveShippingMode: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/shipping-settings-api", () => ({ saveShippingMode }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { updateShippingModeAction } from "@/app/admin/settings/shipping/actions"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }
const DENIAL = { error: "Acceso denegado", status: 403 as const }

describe("updateShippingModeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    saveShippingMode.mockResolvedValue(undefined)
  })

  it("saves the mode scoped to the active store and revalidates both settings paths", async () => {
    const result = await updateShippingModeAction({ mode: "own_rates" })

    expect(result).toEqual({ success: true })
    expect(saveShippingMode).toHaveBeenCalledWith(SERVICE, "store-1", "own_rates")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings/shipping")
    expect(revalidatePath).toHaveBeenCalledWith("/admin/settings")
  })

  it("refuses an input mode the admin selector never offers (D11)", async () => {
    const result = await updateShippingModeAction({ mode: "auto_quote" })

    expect(result.success).toBe(false)
    expect(saveShippingMode).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("refuses when the dueño does not manage the active store, and writes nothing", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue(DENIAL)

    const result = await updateShippingModeAction({ mode: "coordinate" })

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(saveShippingMode).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("returns a generic error and skips revalidation when persistence fails", async () => {
    saveShippingMode.mockRejectedValue(new Error("boom"))

    const result = await updateShippingModeAction({ mode: "coordinate" })

    expect(result).toEqual({ success: false, error: "No se pudo guardar el modo de envío" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
