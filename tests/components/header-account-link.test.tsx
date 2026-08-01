import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  authApiMock,
  cartContextMock,
  checkoutLoginIntentContextMock,
  fontSelectorModalMock,
  lucideReactMock,
  modeContextMock,
  nextImageMock,
  nextLinkMock,
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

// D14: la cuenta se enlaza desde el menú de usuario de la tienda, el mismo sitio
// donde ya vive "Mis pedidos", y solo existe para quien tiene sesión.
const isAuthenticatedValue = vi.hoisted(() => ({ current: true }))

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
    isAdmin: false,
    isSuperAdmin: false,
    role: "user",
    loading: false,
    hasChecked: true,
    refreshPermissions: vi.fn(),
  }),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: isAuthenticatedValue.current ? { id: "user-1", email: "ana@example.com" } : null,
    isAuthenticated: isAuthenticatedValue.current,
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
      nav: { admin: "Admin", account: "Cuenta", dashboard: "Dashboard", orders: "Mis pedidos", home: "Inicio", wishlist: "Wishlist", cart: "Cart" },
      header: { menu: "Menú", loadingCategories: "Cargando", welcome: "Hola {name}", welcomeAdmin: "Hola admin" },
      cart: { checkout: "Checkout" },
    },
  }),
}))
vi.mock("@/components/theme/theme-selector-modal", () => themeSelectorModalMock)
vi.mock("@/components/font/font-selector-modal", () => fontSelectorModalMock)
vi.mock("@/contexts/checkout-login-intent-context", () => checkoutLoginIntentContextMock)
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/lib/supabase/auth-api", () => authApiMock)

import { Header } from "@/components/layout/header"

function accountLinks() {
  return screen.queryAllByRole("link", { name: "Cuenta" })
}

describe("Header account link", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("points an authenticated customer at the account page", async () => {
    isAuthenticatedValue.current = true

    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(accountLinks().length).toBeGreaterThan(0)
    for (const link of accountLinks()) {
      expect(link).toHaveAttribute("href", "/auth/cuenta")
    }
  })

  it("hides the account link from a guest", async () => {
    isAuthenticatedValue.current = false

    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(accountLinks()).toHaveLength(0)
  })
})
