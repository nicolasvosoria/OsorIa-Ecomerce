import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { login, searchParamsGet, toastError } = vi.hoisted(() => ({
  login: vi.fn(),
  searchParamsGet: vi.fn(),
  toastError: vi.fn(),
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

vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }))

import LoginPage from "@/app/auth/login/page"
import { LanguageProvider } from "@/contexts/language-context"

const EMAIL_LABEL = "Correo electrónico"
const PASSWORD_LABEL = "Contraseña"
const MISSING_CREDENTIALS = "Ingresa tu correo y contraseña"

function renderLoginPage() {
  render(
    <LanguageProvider>
      <LoginPage />
    </LanguageProvider>,
  )
}

function fillIn(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function signIn() {
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }))
}

function describedByText(control: HTMLElement): string[] {
  const ids = control.getAttribute("aria-describedby")?.split(" ") ?? []
  return ids.map((id) => document.getElementById(id)?.textContent ?? "")
}

describe("login page accessibility", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParamsGet.mockReturnValue(null)
    login.mockResolvedValue({ success: true })
  })

  // El formulario es toda la página: con `CardTitle` —un <div>— no había ni un
  // solo encabezado, así que pulsar H no llevaba a ninguna parte.
  it("exposes its title as the single level-1 heading of the page", () => {
    renderLoginPage()

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { level: 1 })).toHaveAccessibleName("Inicia sesión")
  })

  it("marks the empty fields invalid and describes why, not only in a toast", () => {
    renderLoginPage()

    signIn()

    const email = screen.getByLabelText(EMAIL_LABEL)
    expect(email).toHaveAttribute("aria-invalid", "true")
    expect(describedByText(email)).toContain(MISSING_CREDENTIALS)
    expect(screen.getByLabelText(PASSWORD_LABEL)).toHaveAttribute("aria-invalid", "true")
    expect(toastError).toHaveBeenCalledWith(MISSING_CREDENTIALS)
  })

  it("blames only the field that is empty", () => {
    renderLoginPage()

    fillIn(EMAIL_LABEL, "duena@tienda.test")
    signIn()

    expect(screen.getByLabelText(EMAIL_LABEL)).not.toHaveAttribute("aria-invalid")
    expect(screen.getByLabelText(PASSWORD_LABEL)).toHaveAttribute("aria-invalid", "true")
  })

  it("leaves the rejection from the server readable on the form", async () => {
    login.mockResolvedValue({ success: false, error: "Credenciales inválidas" })
    renderLoginPage()

    fillIn(EMAIL_LABEL, "duena@tienda.test")
    fillIn(PASSWORD_LABEL, "clave-equivocada")
    signIn()

    const password = screen.getByLabelText(PASSWORD_LABEL)
    await waitFor(() => expect(password).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(password)).toContain("Credenciales inválidas")
    expect(toastError).toHaveBeenCalledWith("Credenciales inválidas")
  })

  it("clears the field errors once the credentials are complete", async () => {
    renderLoginPage()

    signIn()
    fillIn(EMAIL_LABEL, "duena@tienda.test")
    fillIn(PASSWORD_LABEL, "clave-de-la-duena")
    signIn()

    await waitFor(() => expect(login).toHaveBeenCalled())
    expect(screen.getByLabelText(EMAIL_LABEL)).not.toHaveAttribute("aria-invalid")
    expect(screen.getByLabelText(PASSWORD_LABEL)).not.toHaveAttribute("aria-invalid")
  })
})
