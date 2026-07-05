import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  authApiMock,
  cartContextMock,
  checkoutOptionsDialogMock,
  fontSelectorModalMock,
  lucideReactMock,
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

// Suite dedicada a la variante del logo del header según el modo claro/oscuro del sitio
// (`useMode().isDark`), independiente del tema de color activo. `styleOverrides` e
// `isDarkModeOverride` son mutables entre tests para simular ambos ejes sin remontar mocks.
const headerScrollHiddenMock = vi.hoisted(() => vi.fn(() => false))
let styleOverrides = vi.hoisted(() => ({} as Record<string, unknown>))
let isDarkModeOverride = vi.hoisted(() => false)

vi.mock("@/lib/hooks/use-header-scroll-hidden", () => ({ useHeaderScrollHidden: headerScrollHiddenMock }))

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
  useComponentStyle: (_name: string, defaults: Record<string, unknown>) => ({
    styles: { ...defaults, ...styleOverrides },
  }),
}))
vi.mock("@/contexts/theme-context", () => themeContextMock)
vi.mock("@/contexts/mode-context", () => ({
  useMode: () => ({
    mode: isDarkModeOverride ? "dark" : "light",
    isDark: isDarkModeOverride,
    setMode: vi.fn(),
  }),
}))
vi.mock("@/contexts/store-context", () => storeContextMock)
vi.mock("@/contexts/cart-context", () => cartContextMock)
vi.mock("@/contexts/wishlist-context", () => wishlistContextMock)
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: null, isAuthenticated: false, login: vi.fn(), register: vi.fn(), logout: vi.fn(), refreshUser: vi.fn() }) }))
vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    t: {
      auth: { login: "Iniciar sesión", createAccount: "Crear cuenta", signIn: "Entrar" },
      header: { searchPlaceholder: "Buscar...", search: "Buscar", menu: "Menú", viewAllResults: "Ver todos los resultados de '{query}'", noProductsFound: "No se encontraron productos" },
      cart: { checkout: "Checkout" },
      nav: { wishlist: "Wishlist", cart: "Cart", account: "Cuenta" },
    },
    language: "es",
  }),
}))
vi.mock("@/components/theme/theme-selector-modal", () => themeSelectorModalMock)
vi.mock("@/components/font/font-selector-modal", () => fontSelectorModalMock)
vi.mock("@/components/cart/checkout-options-dialog", () => checkoutOptionsDialogMock)
vi.mock("sonner", () => sonnerMock)
vi.mock("@/lib/supabase/auth-api", () => authApiMock)
vi.mock("@/lib/products/featured-product", () => ({ resolveFeaturedProductId: vi.fn().mockResolvedValue(null) }))
vi.mock("@/components/layout/header-mega-menu", () => ({
  HeaderMegaMenu: ({ categoryName }: { categoryName: string }) => <div data-testid="mega-menu-panel">{categoryName}</div>,
}))

import { Header } from "@/components/layout/header"

describe("Header logo dark-mode wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    styleOverrides = {}
    isDarkModeOverride = false
    headerScrollHiddenMock.mockReturnValue(false)
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("renders the light logo with no invert class when the site mode is light", async () => {
    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    const [logo] = screen.getAllByAltText("Osoria Logo")
    expect(logo).toHaveAttribute("src", "/logo-negro.svg")
    expect(logo.className).not.toContain("dark:invert")
  })

  it("switches to logoImageDark when the site is toggled to dark mode", async () => {
    isDarkModeOverride = true
    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    const [logo] = screen.getAllByAltText("Osoria Logo")
    expect(logo).toHaveAttribute("src", "/logo-osoria-blanco.svg")
    expect(logo.className).not.toContain("dark:invert")
  })

  it("falls back to a dark: invert class when dark mode is active but no logoImageDark is configured", async () => {
    isDarkModeOverride = true
    styleOverrides = { logoImageDark: "" }
    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    const [logo] = screen.getAllByAltText("Osoria Logo")
    expect(logo).toHaveAttribute("src", "/logo-negro.svg")
    expect(logo.className).toContain("dark:invert")
  })

  it("keeps the dark: invert class present but inert in light mode when no logoImageDark is configured", async () => {
    styleOverrides = { logoImageDark: "" }
    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    // The class is applied unconditionally when there's no dedicated dark logo; it's the
    // Tailwind `dark:` (`.dark` ancestor) selector, not this class list, that keeps it inert
    // in light mode.
    const [logo] = screen.getAllByAltText("Osoria Logo")
    expect(logo).toHaveAttribute("src", "/logo-negro.svg")
    expect(logo.className).toContain("dark:invert")
  })
})
