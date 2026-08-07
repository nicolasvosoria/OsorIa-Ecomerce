import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  adminPermissionsContextMock,
  authApiMock,
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

// D2: el botón de checkout del carrito navega directo a /checkout para
// cualquier sesión (invitado o logueado) — ya no existe el diálogo intermedio
// de opciones. `isAuthenticatedOverride` y `loginRequestCountOverride` son
// mutables entre tests para cubrir ambos estados de sesión y la señal del
// banner de invitado sin remontar mocks.
const routerPush = vi.hoisted(() => vi.fn())
let isAuthenticatedOverride = vi.hoisted(() => false)
let loginRequestCountOverride = vi.hoisted(() => 0)
const requestLoginMock = vi.hoisted(() => vi.fn())

const CART_ITEM_FIXTURE = [
  { id: "item-1", name: "Parlante Bluetooth", price: "100000", image: "", quantity: 1 },
]

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
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
  useComponentStyle: (_name: string, defaults: Record<string, unknown>) => ({ styles: defaults }),
}))
vi.mock("@/contexts/theme-context", () => themeContextMock)
vi.mock("@/contexts/mode-context", () => modeContextMock)
vi.mock("@/contexts/store-context", () => storeContextMock)
vi.mock("@/contexts/cart-context", () => ({
  useCart: () => ({
    items: CART_ITEM_FIXTURE,
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    getTotal: () => 100000,
    getItemSubtotal: () => 100000,
    getTotalItems: () => 1,
  }),
}))
// D29 regression guard: `subtotal` and `total` mirror each other numerically
// today (shipping is still hardcoded to zero), so a value-based assertion on
// the rendered string can't tell which field the drawer actually reads —
// it would stay green even if header.tsx silently reverted to `formattedTotal`.
// Stubbing two obviously distinct strings makes the assertion target the field.
vi.mock("@/lib/cart/cart-summary", () => ({
  buildLocalCartSummary: () => ({
    lines: [{ id: "item-1", formattedLineTotal: "$ 100.000" }],
    subtotal: 100000,
    total: 130000,
    currencyCode: "COP",
    formattedSubtotal: "SUBTOTAL-STUB-111",
    formattedTotal: "TOTAL-STUB-999",
  }),
}))
vi.mock("@/contexts/wishlist-context", () => wishlistContextMock)
vi.mock("@/contexts/admin-permissions-context", () => adminPermissionsContextMock)
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: isAuthenticatedOverride ? { id: "user-1", email: "ada@example.com" } : null,
    isAuthenticated: isAuthenticatedOverride,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}))
vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    t: {
      auth: { login: "Iniciar sesión", createAccount: "Crear cuenta", signIn: "Entrar" },
      header: {
        searchPlaceholder: "Buscar...",
        search: "Buscar",
        menu: "Menú",
        viewAllResults: "Ver todos los resultados de '{query}'",
        noProductsFound: "No se encontraron productos",
        welcome: "Hola {name}",
        welcomeAdmin: "Hola admin",
      },
      cart: {
        checkout: "Finalizar compra",
        subtotal: "Subtotal",
        total: "Total",
        shippingCalculatedAtCheckout: "El envío se calcula en el checkout",
      },
      nav: { wishlist: "Wishlist", cart: "Cart", account: "Cuenta" },
    },
    language: "es",
  }),
}))
vi.mock("@/components/theme/theme-selector-modal", () => themeSelectorModalMock)
vi.mock("@/components/font/font-selector-modal", () => fontSelectorModalMock)
vi.mock("@/contexts/checkout-login-intent-context", () => ({
  useCheckoutLoginIntent: () => ({
    loginRequestCount: loginRequestCountOverride,
    requestLogin: requestLoginMock,
  }),
}))
vi.mock("sonner", () => sonnerMock)
vi.mock("@/lib/supabase/auth-api", () => authApiMock)
vi.mock("@/lib/products/featured-product", () => ({ resolveFeaturedProductId: vi.fn().mockResolvedValue(null) }))
vi.mock("@/components/layout/header-mega-menu", () => ({
  HeaderMegaMenu: ({ categoryName }: { categoryName: string }) => <div data-testid="mega-menu-panel">{categoryName}</div>,
}))

import { Header } from "@/components/layout/header"

describe("Header cart checkout button", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticatedOverride = false
    loginRequestCountOverride = 0
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("navigates a guest straight to /checkout, with no options dialog", async () => {
    render(<Header />)

    fireEvent.click(await screen.findByText("Finalizar compra"))

    expect(routerPush).toHaveBeenCalledWith("/checkout")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("navigates a signed-in customer straight to /checkout, with no options dialog", async () => {
    isAuthenticatedOverride = true
    render(<Header />)

    fireEvent.click(await screen.findByText("Finalizar compra"))

    expect(routerPush).toHaveBeenCalledWith("/checkout")
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })
})

describe("Header cart drawer summary label (D29)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticatedOverride = false
    loginRequestCountOverride = 0
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("labels the cart drawer amount 'Subtotal' and notes shipping is calculated at checkout", async () => {
    render(<Header />)

    expect(await screen.findByText("Subtotal:")).toBeInTheDocument()
    expect(screen.getByText("El envío se calcula en el checkout")).toBeInTheDocument()
    expect(screen.queryByText("Total:")).not.toBeInTheDocument()
  })
})

describe("Header cart drawer amount field (D29 regression guard)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticatedOverride = false
    loginRequestCountOverride = 0
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("renders formattedSubtotal, not formattedTotal, as the drawer amount", async () => {
    render(<Header />)

    expect(await screen.findByText("SUBTOTAL-STUB-111")).toBeInTheDocument()
    expect(screen.queryByText("TOTAL-STUB-999")).not.toBeInTheDocument()
  })
})

describe("Header reacting to the checkout guest banner's login intent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isAuthenticatedOverride = false
    loginRequestCountOverride = 0
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
  })

  it("opens the login modal when the checkout login intent signal changes", async () => {
    const { rerender } = render(<Header />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    loginRequestCountOverride = 1
    rerender(<Header />)

    expect(await screen.findByRole("dialog")).toBeInTheDocument()
  })
})
