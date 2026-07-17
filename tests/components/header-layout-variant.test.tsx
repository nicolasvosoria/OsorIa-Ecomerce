import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  adminPermissionsContextMock,
  authApiMock,
  cartContextMock,
  checkoutLoginIntentContextMock,
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

const routerPush = vi.hoisted(() => vi.fn())
const headerScrollHiddenMock = vi.hoisted(() => vi.fn(() => false))
let styleOverrides = vi.hoisted(() => ({} as Record<string, unknown>))

vi.mock("@/lib/hooks/use-header-scroll-hidden", () => ({ useHeaderScrollHidden: headerScrollHiddenMock }))

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
  useComponentStyle: (_name: string, defaults: Record<string, unknown>) => ({
    styles: { ...defaults, ...styleOverrides },
  }),
}))
vi.mock("@/contexts/theme-context", () => themeContextMock)
vi.mock("@/contexts/mode-context", () => modeContextMock)
vi.mock("@/contexts/store-context", () => storeContextMock)
vi.mock("@/contexts/cart-context", () => cartContextMock)
vi.mock("@/contexts/wishlist-context", () => wishlistContextMock)
vi.mock("@/contexts/admin-permissions-context", () => adminPermissionsContextMock)
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
vi.mock("@/contexts/checkout-login-intent-context", () => checkoutLoginIntentContextMock)
vi.mock("sonner", () => sonnerMock)
vi.mock("@/lib/supabase/auth-api", () => authApiMock)
vi.mock("@/lib/products/featured-product", () => ({ resolveFeaturedProductId: vi.fn().mockResolvedValue(null) }))
vi.mock("@/components/layout/header-mega-menu", () => ({
  HeaderMegaMenu: ({ categoryName }: { categoryName: string }) => <div data-testid="mega-menu-panel">{categoryName}</div>,
}))

import { Header } from "@/components/layout/header"
import { resolveFeaturedProductId } from "@/lib/products/featured-product"

const CATEGORY_FIXTURE = [{ id: "cat-1", category_name: "Parlantes", display_order: 1 }]

describe("Header layout variants", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    styleOverrides = {}
    headerScrollHiddenMock.mockReturnValue(false)
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(CATEGORY_FIXTURE), { status: 200 })))
  })

  it("renders the classic variant as two desktop rows by default", async () => {
    render(<Header />)

    expect(await screen.findByTestId("header-desktop-classic")).toBeInTheDocument()
    expect(screen.getAllByTestId("header-row")).toHaveLength(2)
    expect(screen.queryByTestId("header-desktop-compact")).not.toBeInTheDocument()
    expect(screen.queryByTestId("header-desktop-centered")).not.toBeInTheDocument()
  })

  it("renders the compact variant as a single desktop row", async () => {
    styleOverrides = { layoutVariant: "compact" }
    render(<Header />)

    expect(await screen.findByTestId("header-desktop-compact")).toBeInTheDocument()
    expect(screen.getAllByTestId("header-row")).toHaveLength(1)
  })

  it("renders the centered variant with logo and nav centered", async () => {
    styleOverrides = { layoutVariant: "centered" }
    render(<Header />)

    expect(await screen.findByTestId("header-desktop-centered")).toBeInTheDocument()
    const rows = screen.getAllByTestId("header-row")
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveClass("grid-cols-3")
    expect(rows[1].parentElement).toHaveClass("justify-center")
  })

  it("falls back to classic for an unknown layoutVariant value", async () => {
    styleOverrides = { layoutVariant: "brutalist" }
    render(<Header />)

    expect(await screen.findByTestId("header-desktop-classic")).toBeInTheDocument()
  })

  it("opens the mega-menu on category hover in the classic variant", async () => {
    render(<Header />)

    const desktopHeader = await screen.findByTestId("header-desktop-classic")
    const categoryLink = await within(desktopHeader).findByRole("link", { name: "Parlantes" })
    fireEvent.mouseEnter(categoryLink)

    await waitFor(() => {
      expect(screen.getByTestId("mega-menu-panel")).toHaveTextContent("Parlantes")
    })
  })

  it("renders plain category links with no mega-menu in the compact variant", async () => {
    styleOverrides = { layoutVariant: "compact" }
    render(<Header />)

    const desktopHeader = await screen.findByTestId("header-desktop-compact")
    const categoryLink = await within(desktopHeader).findByRole("link", { name: "Parlantes" })
    fireEvent.mouseEnter(categoryLink)

    expect(screen.queryByTestId("mega-menu-panel")).not.toBeInTheDocument()
  })

  it("renders plain category links with no mega-menu in the centered variant", async () => {
    styleOverrides = { layoutVariant: "centered" }
    render(<Header />)

    const desktopHeader = await screen.findByTestId("header-desktop-centered")
    const categoryLink = await within(desktopHeader).findByRole("link", { name: "Parlantes" })
    fireEvent.mouseEnter(categoryLink)

    expect(screen.queryByTestId("mega-menu-panel")).not.toBeInTheDocument()
  })

  it("no longer gives the classic nav row its own sticky/border (unified header-level sticky)", async () => {
    render(<Header />)

    const desktopHeader = await screen.findByTestId("header-desktop-classic")
    const navRow = within(desktopHeader).getByTestId("header-nav-row")

    expect(navRow).toHaveClass("relative")
    expect(navRow).not.toHaveClass("sticky")
    expect(navRow).not.toHaveClass("border-b")
  })

  it("prefetches mega-menu featured products only for the classic variant", async () => {
    render(<Header />)

    await screen.findByTestId("header-desktop-classic")

    await waitFor(() => {
      expect(resolveFeaturedProductId).toHaveBeenCalledWith("cat-1", undefined)
    })
  })

  it("skips the mega-menu featured product prefetch for the compact variant", async () => {
    styleOverrides = { layoutVariant: "compact" }
    render(<Header />)

    const desktopHeader = await screen.findByTestId("header-desktop-compact")
    await within(desktopHeader).findByRole("link", { name: "Parlantes" })

    expect(resolveFeaturedProductId).not.toHaveBeenCalled()
  })
})

describe("Header sticky mode", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    styleOverrides = {}
    headerScrollHiddenMock.mockReturnValue(false)
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(CATEGORY_FIXTURE), { status: 200 })))
  })

  it("defaults classic to smart sticky: sticky, transitionable, and visible at the top", async () => {
    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    const header = screen.getByRole("banner")
    expect(header).toHaveClass("sticky")
    expect(header).toHaveClass("top-0")
    expect(header).toHaveClass("transition-transform")
    expect(header).toHaveClass("translate-y-0")
    expect(header).not.toHaveClass("-translate-y-full")
  })

  it("hides the header via -translate-y-full when smart mode reports scrolled-down", async () => {
    headerScrollHiddenMock.mockReturnValue(true)
    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    expect(screen.getByRole("banner")).toHaveClass("-translate-y-full")
  })

  it("defaults compact to fixed sticky with no transform transition", async () => {
    styleOverrides = { layoutVariant: "compact" }
    render(<Header />)
    await screen.findByTestId("header-desktop-compact")

    const header = screen.getByRole("banner")
    expect(header).toHaveClass("sticky")
    expect(header).toHaveClass("top-0")
    expect(header).not.toHaveClass("transition-transform")
  })

  it("honors an explicit stickyMode override regardless of the variant default", async () => {
    styleOverrides = { layoutVariant: "classic", stickyMode: "none" }
    render(<Header />)
    await screen.findByTestId("header-desktop-classic")

    const header = screen.getByRole("banner")
    expect(header).not.toHaveClass("sticky")
    expect(header).not.toHaveClass("transition-transform")
  })
})
