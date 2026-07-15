import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  authorizeActiveStoreAdmin,
  createCombo,
  updateCombo,
  deleteCombo,
  revalidatePath,
} = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  createCombo: vi.fn(),
  updateCombo: vi.fn(),
  deleteCombo: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/combos-api", () => ({ createCombo, updateCombo, deleteCombo }))
vi.mock("next/cache", () => ({ revalidatePath }))

import {
  createComboAction,
  deleteComboAction,
  updateComboAction,
} from "@/app/admin/products/combos/actions"
import type { ComboFormValues } from "@/lib/combos/schemas"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const baseInput: ComboFormValues = {
  name: "  Combo Café  ",
  slug: "",
  category_id: "",
  description: "",
  image_url: "https://cdn/combo.webp",
  is_active: true,
  discount_type: "percentage",
  discount_value: "10",
  components: [
    { product_id: "coffee", variant_id: "", quantity: "1" },
    { product_id: "mug", variant_id: "extra-large", quantity: "2" },
    { product_id: "", variant_id: "", quantity: "1" },
  ],
}

describe("combo server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    createCombo.mockResolvedValue({ success: true })
    updateCombo.mockResolvedValue({ success: true })
    deleteCombo.mockResolvedValue({ success: true })
  })

  it("creates a combo scoped to the active store with the service client, dropping empty component drafts", async () => {
    const result = await createComboAction(baseInput)

    expect(result).toEqual({ success: true, error: undefined })
    expect(createCombo).toHaveBeenCalledTimes(1)
    const [data, client] = createCombo.mock.calls[0]
    expect(client).toBe(SERVICE)
    expect(data).toMatchObject({
      store_id: "store-1",
      name: "  Combo Café  ",
      components: [
        { product_id: "coffee", variant_id: null, quantity: 1, display_order: 0 },
        { product_id: "mug", variant_id: "extra-large", quantity: 2, display_order: 1 },
      ],
    })
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products/combos")
  })

  it("refuses to create a combo when authorization is denied", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    const result = await createComboAction(baseInput)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(createCombo).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("updates a combo scoped to the active store via the resolved storeId and service client", async () => {
    const result = await updateComboAction("combo-1", baseInput)

    expect(result).toEqual({ success: true, error: undefined })
    expect(updateCombo).toHaveBeenCalledTimes(1)
    const [id, , storeId, client] = updateCombo.mock.calls[0]
    expect(id).toBe("combo-1")
    expect(storeId).toBe("store-1")
    expect(client).toBe(SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products/combos")
  })

  it("deletes a combo scoped to the active store via the resolved storeId and service client", async () => {
    const result = await deleteComboAction("combo-1")

    expect(result).toEqual({ success: true, error: undefined })
    expect(deleteCombo).toHaveBeenCalledWith("combo-1", "store-1", SERVICE)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/products/combos")
  })

  it("refuses to delete a combo when authorization is denied", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    const result = await deleteComboAction("combo-1")

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(deleteCombo).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  // Key D13 regression: a delete blocked by a business rule (not an
  // authorization gate) must surface the combos-api's own message instead of
  // a hardcoded generic one — see ConfirmActionButton's `result.error` toast.
  it("surfaces the combos-api's own message when the delete fails", async () => {
    deleteCombo.mockResolvedValue({ success: false, error: "Combo no encontrado" })

    const result = await deleteComboAction("combo-1")

    expect(result).toEqual({ success: false, error: "Combo no encontrado" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
