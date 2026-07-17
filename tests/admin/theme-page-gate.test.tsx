import { beforeEach, describe, expect, it, vi } from "vitest"

const { authorizeActiveStoreAdmin, redirect } = vi.hoisted(() => ({
  authorizeActiveStoreAdmin: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }))
vi.mock("next/navigation", () => ({ redirect }))

// The client editor is irrelevant to the server gate; stub it so this RSC test
// doesn't pull in the whole theme editor subtree.
vi.mock("@/components/theme/theme-custom-editor", () => ({
  ThemeCustomEditor: () => null,
}))

import AdminThemePage from "@/app/admin/theme/page"

describe("AdminThemePage server gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders the editor for an admin who manages the active store", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: {},
      storeId: "store-1",
      userId: "owner-1",
    })

    const page = await AdminThemePage()

    expect(page).not.toBeNull()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("redirects server-side when the active store admin gate denies access", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })
    redirect.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT")
    })

    await expect(AdminThemePage()).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/")
  })
})
