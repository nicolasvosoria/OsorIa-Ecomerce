import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  authApiMock,
  cartContextMock,
  checkoutOptionsDialogMock,
  fontSelectorModalMock,
  lucideReactMock,
  modeContextMock,
  nextImageMock,
  nextLinkMock,
  sonnerMock,
  storeContextMock,
  themeContextMock,
  themeSelectorModalMock,
  uiAlertDialogMock,
  uiButtonMock,
  uiDialogMock,
  uiDropdownMenuMock,
  uiInputMock,
  uiSheetMock,
  wishlistContextMock,
} from "./_helpers/header-test-mocks"

const isAdminValue = vi.hoisted(() => ({ current: false }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => ({ get: () => null }),
}))

vi.mock("next/image", () => nextImageMock)
vi.mock("next/link", () => nextLinkMock)
vi.mock("lucide-react", () => lucideReactMock)

vi.mock("@/components/ui/button", () => uiButtonMock)
vi.mock("@/components/ui/input", () => uiInputMock)
vi.mock("@/components/ui/sheet", () => uiSheetMock)
vi.mock("@/components/ui/dialog", () => uiDialogMock)
vi.mock("@/components/ui/alert-dialog", () => uiAlertDialogMock)
vi.mock("@/components/ui/dropdown-menu", () => uiDropdownMenuMock)

vi.mock("@/contexts/styles-context", () => ({
  useComponentStyle: (_name: string, defaults: Record<string, string>) => ({ styles: defaults }),
}))
vi.mock("@/contexts/theme-context", () => themeContextMock)
vi.mock("@/contexts/mode-context", () => modeContextMock)
vi.mock("@/contexts/store-context", () => storeContextMock)
vi.mock("@/contexts/cart-context", () => cartContextMock)
vi.mock("@/contexts/wishlist-context", () => wishlistContextMock)
vi.mock("@/contexts/admin-permissions-context", () => ({
  useAdminPermissions: () => ({
    isAdmin: isAdminValue.current,
    isSuperAdmin: false,
    role: "user",
    loading: false,
    hasChecked: true,
    refreshPermissions: vi.fn(),
  }),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "store-owner-1", email: "gerardo.romero@osoria.tech", role: "user" },
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}))
vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    t: {
      auth: { login: "Iniciar sesión", logout: "Cerrar sesión" },
      admin: { pageEditor: "Editor de página", administration: "Administración" },
      nav: { admin: "Admin", account: "Mi cuenta", dashboard: "Dashboard", home: "Inicio", wishlist: "Wishlist", cart: "Cart" },
      header: { menu: "Menú", loadingCategories: "Cargando", welcome: "Hola {name}", welcomeAdmin: "Hola admin" },
      cart: { checkout: "Checkout" },
    },
  }),
}))
vi.mock("@/components/theme/theme-selector-modal", () => themeSelectorModalMock)
vi.mock("@/components/font/font-selector-modal", () => fontSelectorModalMock)
vi.mock("@/components/cart/checkout-options-dialog", () => checkoutOptionsDialogMock)
vi.mock("sonner", () => sonnerMock)
vi.mock("@/lib/supabase/auth-api", () => authApiMock)

import { Header } from "@/components/layout/header"

function adminLinks() {
  return screen.queryAllByRole("link", { name: "Editor de página" })
}

describe("Header admin link", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("shows the admin editor link to a store owner whose global role is 'user'", async () => {
    isAdminValue.current = true

    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(adminLinks().length).toBeGreaterThan(0)
  })

  it("hides the admin editor link from a 'user' that manages no store", async () => {
    isAdminValue.current = false

    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(adminLinks()).toHaveLength(0)
  })
})
