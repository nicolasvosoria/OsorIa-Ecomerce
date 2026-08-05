import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { StoreIdentityPanel } from "@/app/admin/settings/components/store-identity-panel"
import { StorePublicationPanel } from "@/app/admin/settings/components/store-publication-panel"

const { authorizeActiveStoreAdmin, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("next/navigation", () => ({ redirect }))

import StoreSettingsPage from "@/app/admin/settings/page"

const ACTIVE_STORE_ID = "store-1"

const IDENTITY_ROWS: Record<string, unknown> = {
  store_branding: { logo_url: "https://cdn.example.com/logo.png", primary_color: "#5daba8" },
  store_contact: {
    contact_email: "hola@cumbre.example",
    contact_phone: "3000000000",
    address: "Bogotá, Colombia",
    reply_to_email: null,
    reply_to_pending_email: null,
    reply_to_verified_at: null,
    order_mailbox_email: "pedidos@cumbre.example",
    order_mailbox_pending_email: null,
    order_mailbox_verified_at: "2026-08-01T00:00:00.000Z",
  },
}

// `.from(table)` branches per table so the page's three parallel identity
// queries (stores, store_branding, store_contact) each resolve their own
// shape instead of accidentally sharing one row -- a bug this exact mock
// shape would hide.
function createSupabaseMock(storeRow: { store_name: string; is_public: boolean; legal_name?: string; subdomain?: string } | null, storeError: unknown = null) {
  const from = vi.fn((table: string) => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: table === "stores" ? storeRow : (IDENTITY_ROWS[table] ?? null),
      error: table === "stores" ? storeError : null,
    })
    const eq = vi.fn(() => ({ maybeSingle }))
    const select = vi.fn(() => ({ eq }))
    return { select, eq, maybeSingle }
  })
  return { from }
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

describe("StoreSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reads the ACTIVE store's publication state and hands it to the panel", async () => {
    const supabase = createSupabaseMock({
      store_name: "Tienda Demo",
      is_public: true,
      legal_name: "Tienda Demo S.A.S.",
      subdomain: "tienda-demo",
    })
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase,
      storeId: ACTIVE_STORE_ID,
      userId: "owner-1",
    })

    const page = await StoreSettingsPage()

    expect(supabase.from).toHaveBeenCalledWith("stores")

    const publicationPanel = findElementOfType(page, StorePublicationPanel) as ReactElement<
      ComponentProps<typeof StorePublicationPanel>
    > | null
    expect(publicationPanel?.props.initialIsPublic).toBe(true)
  })

  it("loads the store's identity snapshot (legal name, branding, contact, mailbox state) into the identity panel", async () => {
    const supabase = createSupabaseMock({
      store_name: "Tienda Demo",
      is_public: true,
      legal_name: "Tienda Demo S.A.S.",
      subdomain: "tienda-demo",
    })
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase,
      storeId: ACTIVE_STORE_ID,
      userId: "owner-1",
    })

    const page = await StoreSettingsPage()

    expect(supabase.from).toHaveBeenCalledWith("store_branding")
    expect(supabase.from).toHaveBeenCalledWith("store_contact")

    const identityPanel = findElementOfType(page, StoreIdentityPanel) as ReactElement<
      ComponentProps<typeof StoreIdentityPanel>
    > | null
    expect(identityPanel?.props.initial).toMatchObject({
      displayName: "Tienda Demo",
      legalName: "Tienda Demo S.A.S.",
      logoUrl: "https://cdn.example.com/logo.png",
      primaryColor: "#5daba8",
      phone: "3000000000",
      commercialAddress: "Bogotá, Colombia",
      replyToVerifiedAt: null,
      orderMailboxEmail: "pedidos@cumbre.example",
      orderMailboxVerifiedAt: "2026-08-01T00:00:00.000Z",
    })
  })

  it("redirects instead of reading when the active store admin gate denies access", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(StoreSettingsPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/")
  })

  it("redirects to the admin dashboard when the store row cannot be read", async () => {
    const supabase = createSupabaseMock(null, { message: "boom" })
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase,
      storeId: ACTIVE_STORE_ID,
      userId: "owner-1",
    })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(StoreSettingsPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/admin")
  })
})
