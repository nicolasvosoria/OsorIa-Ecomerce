import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const routerPush = vi.hoisted(() => vi.fn())
const searchParamsGet = vi.hoisted(() => vi.fn())
const login = vi.hoisted(() => vi.fn())
const isCurrentUserAdminOrUnverified = vi.hoisted(() => vi.fn())
const currentUserMustChangePassword = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  useSearchParams: () => ({ get: searchParamsGet }),
}))

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ login }),
}))

vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdminOrUnverified,
  currentUserMustChangePassword,
}))

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import LoginPage from "@/app/auth/login/page"
import { LanguageProvider } from "@/contexts/language-context"

function signInWith(next: string | null) {
  searchParamsGet.mockImplementation((key: string) => (key === "next" ? next : null))

  render(
    <LanguageProvider>
      <LoginPage />
    </LanguageProvider>,
  )
  fireEvent.change(screen.getByLabelText("Correo electrónico"), {
    target: { value: "duena@tienda.test" },
  })
  fireEvent.change(screen.getByLabelText("Contraseña"), {
    target: { value: "clave-de-la-duena" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }))
}

describe("login return destination", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    login.mockResolvedValue({ success: true })
    isCurrentUserAdminOrUnverified.mockResolvedValue(true)
    currentUserMustChangePassword.mockResolvedValue(false)
  })

  // El aviso de tienda apagada enlaza aquí con `next=/admin/settings` (D4): si el
  // login empujara a "/", el proxy reescribiría la raíz al mismo aviso y el dueño
  // volvería al callejón del que salió.
  it("returns the owner to the publication panel asked for in next", async () => {
    signInWith("/admin/settings")

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/settings")
    })
    expect(routerPush).not.toHaveBeenCalledWith("/")
  })

  it.each([
    "//evil.example/admin/settings",
    "https://evil.example/admin/settings",
    "/cuenta",
  ])("refuses the unsafe next %s instead of turning it into an open redirect", async (unsafeNext) => {
    signInWith(unsafeNext)

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin")
    })
    expect(routerPush).not.toHaveBeenCalledWith(expect.stringContaining("evil"))
    expect(routerPush).not.toHaveBeenCalledWith(unsafeNext)
  })

  it("sends an owner with a temporary password to the change screen before honoring next", async () => {
    currentUserMustChangePassword.mockResolvedValue(true)

    signInWith("/admin/settings")

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/auth/force-password-change")
    })
    expect(routerPush).not.toHaveBeenCalledWith("/admin/settings")
  })

  it("does not let a customer who manages no store reach an admin next destination", async () => {
    isCurrentUserAdminOrUnverified.mockResolvedValue(false)

    signInWith("/admin/settings")

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/?admin_access=denied")
    })
    expect(routerPush).not.toHaveBeenCalledWith("/admin/settings")
  })

  // Sin `next`, el destino se decide por capacidad: la consola para quien puede
  // administrarla, y la raíz para el cliente, que no tiene consola donde aterrizar.
  it("sends an admin-capable user with no next to the console", async () => {
    signInWith(null)

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin")
    })
  })

  it("leaves a plain customer with no next on the storefront root", async () => {
    isCurrentUserAdminOrUnverified.mockResolvedValue(false)

    signInWith(null)

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/")
    })
  })

  it("navigates nowhere when the credentials are rejected", async () => {
    login.mockResolvedValue({ success: false, error: "Credenciales inválidas" })

    signInWith("/admin/settings")

    await waitFor(() => {
      expect(login).toHaveBeenCalled()
    })
    expect(routerPush).not.toHaveBeenCalled()
  })
})
