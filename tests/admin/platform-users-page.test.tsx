import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { PlatformUser } from "@/lib/supabase/platform-users-api"

const { authorizeSuperAdmin, listPlatformUsers, redirect } = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  listPlatformUsers: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT")
  }),
}))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/platform-users-api", () => ({ listPlatformUsers }))
// The users table renders the real role selector, whose server action pulls in
// the console actions module; stub its supabase deps so importing it is inert.
vi.mock("@/lib/supabase/memberships-api", () => ({
  setUserGlobalRole: vi.fn(),
  grantSupportMembership: vi.fn(),
  resetOwnerCredential: vi.fn(),
}))
vi.mock("@/lib/supabase/stores-admin-api", () => ({ createTenant: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({
  redirect,
  usePathname: () => "/admin/stores/users",
  useRouter: () => ({ push: vi.fn() }),
}))

import PlatformUsersPage from "@/app/(platform)/admin/stores/users/page"

const USERS: PlatformUser[] = [
  {
    id: "super-1",
    email: "super@osoria.tech",
    first_name: "Sole",
    last_name: "Super",
    role: "super_admin",
    created_at: "2026-01-05T00:00:00.000Z",
    signupStoreName: null,
  },
  {
    id: "user-2",
    email: "cliente@correo.com",
    first_name: "Cliente",
    last_name: "Dos",
    role: "user",
    created_at: "2026-02-05T00:00:00.000Z",
    signupStoreName: "Tienda Dos",
  },
]

describe("PlatformUsersPage (D8)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })
    listPlatformUsers.mockResolvedValue(USERS)
  })

  it("redirects to the console when the caller isn't a super_admin", async () => {
    authorizeSuperAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    await expect(PlatformUsersPage()).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/admin/stores")
    expect(listPlatformUsers).not.toHaveBeenCalled()
  })

  it("renders the global user list with the role selector for other users", async () => {
    render(await PlatformUsersPage())

    expect(screen.getByText("Usuarios de la plataforma")).toBeInTheDocument()
    expect(screen.getByText("cliente@correo.com")).toBeInTheDocument()
    expect(screen.getByText("super@osoria.tech")).toBeInTheDocument()

    // Every editable row is another user; the actor's own row is a badge, never a
    // select, so exactly one combobox renders for this two-user list.
    expect(screen.getAllByRole("combobox")).toHaveLength(1)
  })

  it("shows each user's signup origin store, or a dash when it has none (D8)", async () => {
    render(await PlatformUsersPage())

    expect(screen.getByText("Tienda Dos")).toBeInTheDocument()
    expect(screen.getAllByText("—").length).toBeGreaterThan(0)
  })

  it("shows the empty state when the platform has no users yet", async () => {
    listPlatformUsers.mockResolvedValue([])

    render(await PlatformUsersPage())

    expect(screen.getByText("No hay usuarios registrados todavía.")).toBeInTheDocument()
  })
})
