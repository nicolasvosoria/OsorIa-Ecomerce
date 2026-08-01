import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  nextLinkMock,
  uiButtonMock,
  uiDropdownMenuMock,
} from "../components/_helpers/header-test-mocks"

// D14: la misma página de cuenta se enlaza desde la consola, no solo desde la
// tienda. Quien no tiene sesión de administrador nunca llega al menú: el guard
// del panel no monta nada detrás de él.
const isAdminValue = vi.hoisted(() => ({ current: true }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock("next/link", () => nextLinkMock)
vi.mock("lucide-react", () => ({
  ChevronDown: () => <span aria-hidden="true" />,
  Loader2: () => <span aria-hidden="true" />,
  LogOut: () => <span aria-hidden="true" />,
  User: () => <span aria-hidden="true" />,
}))
vi.mock("@/components/ui/button", () => uiButtonMock)
vi.mock("@/components/ui/dropdown-menu", () => uiDropdownMenuMock)
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "duena@tienda.test" }, logout: vi.fn() }),
}))
vi.mock("@/contexts/admin-permissions-context", () => ({
  useAdminPermissions: () => ({
    isAdmin: isAdminValue.current,
    loading: false,
    hasChecked: true,
  }),
}))

import { AdminAuthGuard } from "@/components/admin/admin-auth-guard"
import { AdminUserMenu } from "@/components/admin/shell/admin-user-menu"

// La consola no pasa por useLanguage en ninguna de sus pantallas: escribe su
// copia en español, igual que "Cerrar sesión" en este mismo menú.
const ACCOUNT_LABEL = "Cuenta"

function renderGuardedMenu() {
  return render(
    <AdminAuthGuard>
      <AdminUserMenu />
    </AdminAuthGuard>,
  )
}

describe("Admin user menu account link", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("points the signed-in admin at the same account page as the storefront", () => {
    isAdminValue.current = true

    renderGuardedMenu()

    expect(screen.getByRole("link", { name: ACCOUNT_LABEL })).toHaveAttribute(
      "href",
      "/auth/cuenta",
    )
  })

  it("shows no account link when there is no admin session behind the guard", () => {
    isAdminValue.current = false

    renderGuardedMenu()

    expect(screen.queryByRole("link", { name: ACCOUNT_LABEL })).toBeNull()
  })
})
