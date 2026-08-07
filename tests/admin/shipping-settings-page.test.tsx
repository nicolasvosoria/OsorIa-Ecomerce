import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ShippingModeForm } from "@/app/admin/settings/shipping/components/shipping-mode-form"

const {
  authorizeActiveStoreAdmin,
  loadShippingSettings,
  listShippingZones,
  findMissingWeightProducts,
  redirect,
} = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  loadShippingSettings: vi.fn(),
  listShippingZones: vi.fn(),
  findMissingWeightProducts: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/shipping-settings-api", () => ({ loadShippingSettings }))
vi.mock("@/lib/supabase/shipping-zones-api", () => ({ listShippingZones, findMissingWeightProducts }))
vi.mock("next/navigation", () => ({ redirect }))

import ShippingSettingsPage from "@/app/admin/settings/shipping/page"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }

function findElementOfType(node: ReactNode, type: unknown): ReactElement | null {
  if (!isValidElement(node)) return null
  if (node.type === type) return node

  const children = (node.props as { children?: ReactNode }).children
  for (const child of Children.toArray(children)) {
    const found = findElementOfType(child, type)
    if (found) return found
  }
  return null
}

describe("ShippingSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
    listShippingZones.mockResolvedValue([])
    findMissingWeightProducts.mockResolvedValue([])
  })

  it("reads the ACTIVE store's saved mode back and hands it to the form as its default", async () => {
    loadShippingSettings.mockResolvedValue({ mode: "own_rates" })

    const page = await ShippingSettingsPage()

    expect(loadShippingSettings).toHaveBeenCalledWith(SERVICE, "store-1")

    const form = findElementOfType(page, ShippingModeForm) as ReactElement<
      ComponentProps<typeof ShippingModeForm>
    > | null
    expect(form?.props.defaultValues).toEqual({ mode: "own_rates" })
  })

  it("falls back to coordinate when the stored mode has no admin selector option (D11)", async () => {
    loadShippingSettings.mockResolvedValue({ mode: "auto_quote" })

    const page = await ShippingSettingsPage()

    const form = findElementOfType(page, ShippingModeForm) as ReactElement<
      ComponentProps<typeof ShippingModeForm>
    > | null
    expect(form?.props.defaultValues).toEqual({ mode: "coordinate" })
  })

  it("redirects instead of reading when the active store admin gate denies access", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(ShippingSettingsPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/")
    expect(loadShippingSettings).not.toHaveBeenCalled()
  })
})
