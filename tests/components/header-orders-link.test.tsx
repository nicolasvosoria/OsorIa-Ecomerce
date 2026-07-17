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

// El link "Mis pedidos" (D5) es visible para cualquier usuario autenticado,
// sea o no admin — a diferencia de Dashboard/Editor que sólo ve un admin
// (ver tests/components/header-admin-link.test.tsx).
const isAdminValue = vi.hoisted(() => ({ current: false }))
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
      nav: { admin: "Admin", account: "Mi cuenta", dashboard: "Dashboard", orders: "Mis pedidos", home: "Inicio", wishlist: "Wishlist", cart: "Cart" },
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

function ordersLinks() {
  return screen.queryAllByRole("link", { name: "Mis pedidos" })
}

describe("Header orders link", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("shows 'Mis pedidos' to an authenticated customer who is not an admin", async () => {
    isAuthenticatedValue.current = true
    isAdminValue.current = false

    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(ordersLinks().length).toBeGreaterThan(0)
    expect(ordersLinks()[0]).toHaveAttribute("href", "/orders")
  })

  it("also shows 'Mis pedidos' to an authenticated admin", async () => {
    isAuthenticatedValue.current = true
    isAdminValue.current = true

    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(ordersLinks().length).toBeGreaterThan(0)
  })

  it("hides 'Mis pedidos' from a guest", async () => {
    isAuthenticatedValue.current = false
    isAdminValue.current = false

    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(ordersLinks()).toHaveLength(0)
  })
})
