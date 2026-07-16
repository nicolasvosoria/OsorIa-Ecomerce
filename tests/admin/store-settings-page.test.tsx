import {
  Children,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { StorePublicationPanel } from "@/app/admin/settings/components/store-publication-panel"

const { authorizeActiveStoreAdmin, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("next/navigation", () => ({ redirect }))

import StoreSettingsPage from "@/app/admin/settings/page"

const ACTIVE_STORE_ID = "store-1"

function createSupabaseMock(row: { store_name: string; is_public: boolean } | null, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error })
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, select, eq, maybeSingle }
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
    const supabase = createSupabaseMock({ store_name: "Tienda Demo", is_public: true })
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase,
      storeId: ACTIVE_STORE_ID,
      userId: "owner-1",
    })

    const page = await StoreSettingsPage()

    expect(supabase.from).toHaveBeenCalledWith("stores")
    expect(supabase.eq).toHaveBeenCalledWith("id", ACTIVE_STORE_ID)

    const panel = findElementOfType(page, StorePublicationPanel) as ReactElement<
      ComponentProps<typeof StorePublicationPanel>
    > | null
    expect(panel?.props.initialIsPublic).toBe(true)
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
