import { type ComponentProps, type ReactElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { HomeDiscountPopupForm } from "@/app/admin/home-discount-popup/components/home-discount-popup-form"
import { normalizeHomeDiscountPopupConfig } from "@/lib/home-discount-popup"

const { authorizeActiveStoreAdmin, loadHomeDiscountPopupConfig, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  loadHomeDiscountPopupConfig: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/home-discount-popup-admin", () => ({ loadHomeDiscountPopupConfig }))
vi.mock("next/navigation", () => ({ redirect }))

import HomeDiscountPopupConfigPage from "@/app/admin/home-discount-popup/page"
import { findElementOfType } from "./_helpers/find-element-of-type"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

const ACTIVE_STORE_CONFIG = normalizeHomeDiscountPopupConfig({
  active: true,
  title: "Promo de la tienda activa",
  text: "Texto",
  ctaText: "Copiar cupon",
  coupon: "HOME10",
  ctaMode: "copy_coupon",
})

describe("HomeDiscountPopupConfigPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    loadHomeDiscountPopupConfig.mockResolvedValue({
      storeId: "store-1",
      config: ACTIVE_STORE_CONFIG,
    })
  })

  it("reads the popup from the active store, the same store the save action writes to", async () => {
    const page = await HomeDiscountPopupConfigPage()

    expect(loadHomeDiscountPopupConfig).toHaveBeenCalledWith(SERVICE, "store-1")

    const form = findElementOfType(page, HomeDiscountPopupForm) as ReactElement<
      ComponentProps<typeof HomeDiscountPopupForm>
    > | null

    expect(form?.props.defaultValues).toEqual(ACTIVE_STORE_CONFIG)
  })

  it("redirects instead of reading when the active store admin gate denies access", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(HomeDiscountPopupConfigPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/")
    expect(loadHomeDiscountPopupConfig).not.toHaveBeenCalled()
  })
})
