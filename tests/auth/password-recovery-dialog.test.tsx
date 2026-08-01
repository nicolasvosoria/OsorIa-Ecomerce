import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { resetPassword, toastError, toastSuccess } = vi.hoisted(() => ({
  resetPassword: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("@/lib/supabase/auth-api", () => ({ resetPassword }))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))

import { PasswordRecoveryDialog } from "@/components/auth/password-recovery-dialog"
import { LanguageProvider } from "@/contexts/language-context"
import { translations } from "@/lib/i18n/translations"

const t = translations.es

const onBackToSignIn = vi.fn()
const onOpenChange = vi.fn()

function openRecoveryDialog() {
  render(
    <LanguageProvider>
      <PasswordRecoveryDialog
        open
        onOpenChange={onOpenChange}
        onBackToSignIn={onBackToSignIn}
      />
    </LanguageProvider>,
  )

  return userEvent.setup()
}

function emailField(): HTMLInputElement {
  return screen.getByLabelText(t.auth.email) as HTMLInputElement
}

function sendButton(): HTMLElement {
  return screen.getByRole("button", { name: t.header.sendRecoveryLink })
}

function describedByText(control: HTMLElement): string[] {
  const ids = control.getAttribute("aria-describedby")?.split(" ") ?? []
  return ids.map((id) => document.getElementById(id)?.textContent ?? "")
}

function submitBypassingNativeConstraint() {
  emailField().closest("form")!.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  )
}

describe("PasswordRecoveryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetPassword.mockResolvedValue({ success: true })
  })

  it("asks Supabase for a link for the address typed in and confirms it was sent", async () => {
    const user = openRecoveryDialog()

    await user.type(emailField(), "duena@tienda.test")
    await user.click(sendButton())

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith("duena@tienda.test"))
    expect(await screen.findByRole("heading", { name: t.header.emailSent })).toBeInTheDocument()
    expect(screen.getByText("duena@tienda.test")).toBeInTheDocument()
    expect(toastSuccess).toHaveBeenCalled()
  })

  // El dueño que pierde la clave temporal no puede quedarse creyendo que el link
  // salió cuando Supabase lo rechazó: no hay otra vía de vuelta que ésta.
  it("surfaces a failed request instead of claiming the link was sent", async () => {
    resetPassword.mockResolvedValue({ success: false, error: "Supabase no configurado" })
    const user = openRecoveryDialog()

    await user.type(emailField(), "duena@tienda.test")
    await user.click(sendButton())

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        t.header.recoveryLinkError,
        expect.objectContaining({ description: "Supabase no configurado" }),
      ),
    )
    expect(screen.queryByRole("heading", { name: t.header.emailSent })).not.toBeInTheDocument()
    expect(sendButton()).toBeInTheDocument()
  })

  it("never requests a link without an address", async () => {
    const user = openRecoveryDialog()

    await user.click(sendButton())

    expect(emailField()).toBeRequired()
    expect(resetPassword).not.toHaveBeenCalled()
  })

  // La restricción nativa del campo es la primera barrera, pero el envío puede
  // llegar por otras vías (Enter en un navegador permisivo, autofill vacío), y
  // ahí el mensaje tiene que salir en el idioma de la interfaz.
  it("refuses an empty address and says so when the native constraint is bypassed", async () => {
    openRecoveryDialog()

    submitBypassingNativeConstraint()

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        t.common.error,
        expect.objectContaining({ description: t.header.enterEmail }),
      ),
    )
    expect(resetPassword).not.toHaveBeenCalled()
  })

  // El toast sale arriba a la izquierda y se va solo: quien trabaja ampliado
  // sobre el botón de enviar nunca lo ve, y el campo no quedaba señalado.
  it("marks the empty address invalid and describes why, not only in a toast", async () => {
    openRecoveryDialog()

    submitBypassingNativeConstraint()

    await waitFor(() => expect(emailField()).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(emailField())).toContain(t.header.enterEmail)
  })

  it("leaves the rejection from Supabase readable on the field", async () => {
    resetPassword.mockResolvedValue({ success: false, error: "Supabase no configurado" })
    const user = openRecoveryDialog()

    await user.type(emailField(), "duena@tienda.test")
    await user.click(sendButton())

    await waitFor(() => expect(emailField()).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(emailField())).toContain("Supabase no configurado")
  })

  it("returns to an empty form when the owner sends it to another address", async () => {
    const user = openRecoveryDialog()

    await user.type(emailField(), "duena@tienda.test")
    await user.click(sendButton())
    await screen.findByRole("heading", { name: t.header.emailSent })

    await user.click(screen.getByRole("button", { name: t.header.sendToAnotherEmail }))

    expect(emailField()).toHaveValue("")
    expect(sendButton()).toBeInTheDocument()
  })

  it("hands the way back to sign in to whoever mounted it", async () => {
    const user = openRecoveryDialog()

    await user.type(emailField(), "duena@tienda.test")
    await user.click(sendButton())
    await screen.findByRole("heading", { name: t.header.emailSent })

    await user.click(screen.getByRole("button", { name: t.header.backToLogin }))

    expect(onBackToSignIn).toHaveBeenCalledTimes(1)
  })

  it("closes through its owner when the request is cancelled", async () => {
    const user = openRecoveryDialog()

    await user.click(screen.getByRole("button", { name: t.common.cancel }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
