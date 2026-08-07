import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ShippingContactPendingNotice } from "@/app/admin/settings/shipping/components/shipping-contact-pending-notice"
import { ShippingModeForm } from "@/app/admin/settings/shipping/components/shipping-mode-form"

const { authorizeActiveStoreAdmin, loadShippingSettings, loadStoreIdentity, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  loadShippingSettings: vi.fn(),
  loadStoreIdentity: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("@/lib/supabase/shipping-settings-api", () => ({ loadShippingSettings }))
vi.mock("@/lib/supabase/store-identity-api", () => ({ loadStoreIdentity }))
vi.mock("next/navigation", () => ({ redirect }))

import ShippingSettingsPage from "@/app/admin/settings/shipping/page"

const SERVICE = { marker: "service-client" }
const GRANT = { supabase: SERVICE, storeId: "store-1", userId: "user-1" }
// D14/F10: complete on every A8 field so the pre-existing cases below --
// about the mode form, not the readiness notice -- never trip the notice by
// accident; the "phone pending" describe block overrides it deliberately.
const COMPLETE_IDENTITY = {
  displayName: "Tienda de prueba",
  legalName: "Tienda de Prueba S.A.S.",
  phone: "3000000000",
  commercialAddress: "Bogotá, Colombia",
  replyToVerifiedAt: "2026-01-01T00:00:00.000Z",
  orderMailboxVerifiedAt: "2026-01-01T00:00:00.000Z",
}

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
    loadStoreIdentity.mockResolvedValue(COMPLETE_IDENTITY)
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

describe("ShippingSettingsPage phone-pending notice (D14/F10/A9)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeActiveStoreAdmin.mockResolvedValue(GRANT)
  })

  function findNotice(page: ReactNode) {
    return findElementOfType(page, ShippingContactPendingNotice) as ReactElement<
      ComponentProps<typeof ShippingContactPendingNotice>
    > | null
  }

  it("shows the notice with reason=missing when the store is in coordinate mode and has no phone", async () => {
    loadShippingSettings.mockResolvedValue({ mode: "coordinate" })
    loadStoreIdentity.mockResolvedValue({ ...COMPLETE_IDENTITY, phone: null })

    const page = await ShippingSettingsPage()

    expect(findNotice(page)?.props.reason).toBe("missing")
  })

  it("shows the notice with reason=invalid when the saved phone can't build a working WhatsApp link (A9)", async () => {
    loadShippingSettings.mockResolvedValue({ mode: "coordinate" })
    loadStoreIdentity.mockResolvedValue({ ...COMPLETE_IDENTITY, phone: "300 000 0000 ext 123" })

    const page = await ShippingSettingsPage()

    expect(findNotice(page)?.props.reason).toBe("invalid")
  })

  it("stays quiet in coordinate mode once the store has a usable phone", async () => {
    loadShippingSettings.mockResolvedValue({ mode: "coordinate" })
    loadStoreIdentity.mockResolvedValue(COMPLETE_IDENTITY)

    const page = await ShippingSettingsPage()

    expect(findNotice(page)).toBeNull()
  })

  it("stays quiet for own_rates even without a phone -- the prerequisite is the coordinate mode's, not every store's", async () => {
    loadShippingSettings.mockResolvedValue({ mode: "own_rates" })
    loadStoreIdentity.mockResolvedValue({ ...COMPLETE_IDENTITY, phone: null })

    const page = await ShippingSettingsPage()

    expect(findNotice(page)).toBeNull()
  })

  it("stays quiet for own_rates even with an unusable phone -- same non-prerequisite reasoning", async () => {
    loadShippingSettings.mockResolvedValue({ mode: "own_rates" })
    loadStoreIdentity.mockResolvedValue({ ...COMPLETE_IDENTITY, phone: "300 000 0000 ext 123" })

    const page = await ShippingSettingsPage()

    expect(findNotice(page)).toBeNull()
  })
})
