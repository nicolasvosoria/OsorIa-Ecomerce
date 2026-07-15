import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, saveHomeDiscountPopupConfig, revalidatePath } = vi.hoisted(
  () => ({
    authorizeActiveStoreAdmin: vi.fn(),
    saveHomeDiscountPopupConfig: vi.fn(),
    revalidatePath: vi.fn(),
  }),
)

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/home-discount-popup-admin", () => ({ saveHomeDiscountPopupConfig }))
vi.mock("next/cache", () => ({ revalidatePath }))

import { saveHomeDiscountPopupConfigAction } from "@/app/admin/home-discount-popup/actions"
import { normalizeHomeDiscountPopupConfig } from "@/lib/home-discount-popup"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const baseInput = normalizeHomeDiscountPopupConfig({
  active: true,
  title: "Promo home",
  text: "Texto",
  ctaText: "Copiar cupon",
  coupon: "HOME10",
  ctaMode: "copy_coupon",
})

describe("home discount popup config server action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    saveHomeDiscountPopupConfig.mockResolvedValue({ storeId: "store-1", config: baseInput })
  })

  it("saves the popup scoped to the active store, never to the request host store", async () => {
    const result = await saveHomeDiscountPopupConfigAction(baseInput)

    expect(result).toEqual({ success: true })
    expect(saveHomeDiscountPopupConfig).toHaveBeenCalledWith(SERVICE, "store-1", baseInput)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/home-discount-popup")
  })

  it("refuses to save when authorization is denied", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    const result = await saveHomeDiscountPopupConfigAction(baseInput)

    expect(result).toEqual({ success: false, error: "Acceso denegado" })
    expect(saveHomeDiscountPopupConfig).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("returns a generic error and does not revalidate when persistence throws", async () => {
    saveHomeDiscountPopupConfig.mockRejectedValue(new Error("Tienda no encontrada"))

    const result = await saveHomeDiscountPopupConfigAction(baseInput)

    expect(result).toEqual({
      success: false,
      error: "No se pudo guardar la configuración del popup",
    })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
