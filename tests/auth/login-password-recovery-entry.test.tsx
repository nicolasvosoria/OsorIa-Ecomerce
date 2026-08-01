import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { resetPassword, login, searchParamsGet } = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  login: vi.fn(),
  searchParamsGet: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => ({ get: searchParamsGet }),
}))
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ login }) }))
vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdminOrUnverified: vi.fn().mockResolvedValue(true),
  currentUserMustChangePassword: vi.fn().mockResolvedValue(false),
}))
vi.mock("@/lib/supabase/auth-api", () => ({ resetPassword }))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import LoginPage from "@/app/auth/login/page"
import { LanguageProvider } from "@/contexts/language-context"
import { translations } from "@/lib/i18n/translations"

const t = translations.es

function renderLoginPage() {
  render(
    <LanguageProvider>
      <LoginPage />
    </LanguageProvider>,
  )

  return userEvent.setup()
}

// El host admin no sirve storefront, así que el header —y su modal de
// recuperación— no existen ahí: esta página es la única puerta de vuelta para el
// dueño que perdió la clave temporal (D8).
describe("login page password recovery entry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParamsGet.mockReturnValue(null)
    resetPassword.mockResolvedValue({ success: true })
  })

  it("offers a way to recover the password without hiding the sign-in form", () => {
    renderLoginPage()

    expect(screen.getByRole("button", { name: t.auth.forgotPassword })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument()
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("reaches the shared recovery flow and requests the link from there", async () => {
    const user = renderLoginPage()

    await user.click(screen.getByRole("button", { name: t.auth.forgotPassword }))

    const recovery = await screen.findByRole("dialog")
    expect(within(recovery).getByRole("heading", { name: t.header.forgotPasswordTitle })).toBeInTheDocument()

    await user.type(within(recovery).getByLabelText(t.auth.email), "duena@tienda.test")
    await user.click(within(recovery).getByRole("button", { name: t.header.sendRecoveryLink }))

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("duena@tienda.test"))
    expect(await within(recovery).findByRole("heading", { name: t.header.emailSent })).toBeInTheDocument()
  })

  it("leaves the recovery dialog without signing anyone in", async () => {
    const user = renderLoginPage()

    await user.click(screen.getByRole("button", { name: t.auth.forgotPassword }))
    const recovery = await screen.findByRole("dialog")
    await user.click(within(recovery).getByRole("button", { name: t.common.cancel }))

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    expect(login).not.toHaveBeenCalled()
  })
})
