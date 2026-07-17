import { existsSync } from "node:fs"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

const { authorizeSuperAdmin, requiresPasswordChange, redirect, requestHost } = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  requiresPasswordChange: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT")
  }),
  requestHost: { value: "tienda2.localhost:3000" },
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/memberships-api", () => ({ requiresPasswordChange }))
vi.mock("next/navigation", () => ({ redirect }))
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: requestHost.value }),
}))
vi.mock("@/components/admin/shell/admin-user-menu", () => ({
  AdminUserMenu: () => <div data-testid="admin-user-menu" />,
}))

import StoresLayout from "@/app/(platform)/admin/stores/layout"

describe("platform console layout gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestHost.value = "tienda2.localhost:3000"
    requiresPasswordChange.mockResolvedValue(false)
  })

  it("redirects a non-super_admin to /admin instead of exposing the tenant console", async () => {
    authorizeSuperAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    await expect(StoresLayout({ children: "tenant console" })).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/admin")
  })

  it("redirects an unauthenticated visitor to /admin", async () => {
    authorizeSuperAdmin.mockResolvedValue({ error: "Acceso denegado", status: 401 })

    await expect(StoresLayout({ children: "tenant console" })).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/admin")
  })

  // On the platform admin host, /admin routes back to this console: exiting
  // there would loop forever, so the layout expels to the deployment root host.
  it("expels a non-super_admin on the admin host to the root host, not /admin", async () => {
    requestHost.value = "admin.localhost:3000"
    authorizeSuperAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    await expect(StoresLayout({ children: "tenant console" })).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("http://localhost:3000/")
  })

  it("forces a super_admin off the temporary password before operating the console", async () => {
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })
    requiresPasswordChange.mockResolvedValue(true)

    await expect(StoresLayout({ children: "tenant console" })).rejects.toThrow("NEXT_REDIRECT")

    expect(requiresPasswordChange).toHaveBeenCalledWith("super-1", {})
    expect(redirect).toHaveBeenCalledWith("/auth/force-password-change")
  })

  it("renders the console inside the platform chrome, without the store shell", async () => {
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })

    render(await StoresLayout({ children: <div data-testid="console-child">consola</div> }))

    expect(redirect).not.toHaveBeenCalled()
    expect(screen.getByText("Consola de plataforma")).toBeInTheDocument()
    expect(screen.getByText("Super admin")).toBeInTheDocument()
    expect(screen.getByTestId("console-child")).toBeInTheDocument()
    // Nada del shell de tienda: ni sidebar ni switcher llegan a este árbol.
    expect(document.querySelector("[data-slot='sidebar']")).toBeNull()
    expect(screen.queryByText("Administración")).not.toBeInTheDocument()
  })
})

// D4: la consola vive en el route group (platform), fuera de app/admin, así que
// app/admin/layout.tsx (gate de membresía + AdminShell + AdminActiveStoreProvider)
// no puede ejecutarse para /admin/stores/** por construcción.
describe("platform console file structure", () => {
  it("lives outside app/admin, so the store admin layout never wraps it", () => {
    expect(existsSync("app/admin/stores")).toBe(false)
    expect(existsSync("app/(platform)/admin/stores/layout.tsx")).toBe(true)
  })
})
