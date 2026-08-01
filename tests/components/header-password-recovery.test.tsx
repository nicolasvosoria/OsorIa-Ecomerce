import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
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

const searchParamsGet = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => ({ get: searchParamsGet }),
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
vi.mock("@/contexts/admin-permissions-context", () => adminPermissionsContextMock)
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}))
// El catálogo real, no un stub: el modal extraído tiene que seguir leyendo las
// mismas claves que leía cuando vivía dentro del header.
vi.mock("@/contexts/language-context", async () => {
  const { translations } = await import("@/lib/i18n/translations")
  return { useLanguage: () => ({ language: "es", t: translations.es }) }
})
vi.mock("@/components/theme/theme-selector-modal", () => themeSelectorModalMock)
vi.mock("@/components/font/font-selector-modal", () => fontSelectorModalMock)
vi.mock("@/contexts/checkout-login-intent-context", () => checkoutLoginIntentContextMock)
vi.mock("sonner", () => sonnerMock)
vi.mock("@/lib/supabase/auth-api", () => authApiMock)
vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdminOrUnverified: vi.fn().mockResolvedValue(false),
  currentUserMustChangePassword: vi.fn().mockResolvedValue(false),
}))

import { Header } from "@/components/layout/header"
import { translations } from "@/lib/i18n/translations"

const t = translations.es

async function openRecoveryFromLoginModal() {
  const user = userEvent.setup()
  render(<Header />)

  await user.click(await screen.findByRole("button", { name: t.auth.forgotPassword }))

  return user
}

// El storefront sigue siendo la entrada de recuperación del cliente: la
// extracción a un componente compartido no puede haberla movido ni cambiado.
describe("Header password recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // El header sólo abre su modal de login por URL cuando el intent trae un
    // destino de vuelta seguro.
    searchParamsGet.mockImplementation((key: string) => {
      const intent: Record<string, string> = { auth: "login", next: "/admin/orders" }
      return intent[key] ?? null
    })
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })))
    authApiMock.resetPassword.mockResolvedValue({ success: true })
  })

  it("opens the recovery flow from the login modal", async () => {
    await openRecoveryFromLoginModal()

    expect(
      await screen.findByRole("heading", { name: t.header.forgotPasswordTitle }),
    ).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: t.auth.login })).not.toBeInTheDocument()
  })

  it("requests the recovery link for the address typed in the header modal", async () => {
    const user = await openRecoveryFromLoginModal()

    await user.type(await screen.findByLabelText(t.auth.email), "cliente@tienda.test")
    await user.click(screen.getByRole("button", { name: t.header.sendRecoveryLink }))

    await waitFor(() =>
      expect(authApiMock.resetPassword).toHaveBeenCalledWith("cliente@tienda.test"),
    )
    expect(await screen.findByRole("heading", { name: t.header.emailSent })).toBeInTheDocument()
  })

  it("hands the customer back to the login modal after the link is sent", async () => {
    const user = await openRecoveryFromLoginModal()

    await user.type(await screen.findByLabelText(t.auth.email), "cliente@tienda.test")
    await user.click(screen.getByRole("button", { name: t.header.sendRecoveryLink }))
    await screen.findByRole("heading", { name: t.header.emailSent })

    await user.click(screen.getByRole("button", { name: t.header.backToLogin }))

    expect(await screen.findByRole("heading", { name: t.auth.login })).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: t.header.emailSent })).not.toBeInTheDocument()
  })
})
