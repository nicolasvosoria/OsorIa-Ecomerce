import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { updatePassword, completeForcedPasswordChange, toastError } = vi.hoisted(() => ({
  updatePassword: vi.fn(),
  completeForcedPasswordChange: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@/lib/supabase/auth-api", () => ({ updatePassword }))
vi.mock("@/app/auth/force-password-change/actions", () => ({ completeForcedPasswordChange }))
vi.mock("sonner", () => ({ toast: { error: toastError, success: vi.fn() } }))

import ForcePasswordChangePage from "@/app/auth/force-password-change/page"

async function fillAndSubmit(password: string, confirm = password) {
  const user = userEvent.setup()
  render(<ForcePasswordChangePage />)
  await user.type(screen.getByLabelText("Nueva contraseña"), password)
  await user.type(screen.getByLabelText("Confirmar nueva contraseña"), confirm)
  await user.click(screen.getByRole("button", { name: "Guardar y entrar" }))
}

describe("ForcePasswordChangePage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // The credential must change before the flag is lifted; otherwise the temporary
  // password stays alive with the forced change already spent.
  it("lifts the flag only after the password change succeeds", async () => {
    updatePassword.mockResolvedValue({ success: true })
    completeForcedPasswordChange.mockResolvedValue({ success: true })

    await fillAndSubmit("nuevaClave123")

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith("nuevaClave123"))
    await waitFor(() => expect(completeForcedPasswordChange).toHaveBeenCalledTimes(1))
  })

  it("never lifts the flag when the password change fails", async () => {
    updatePassword.mockResolvedValue({ success: false, error: "no se pudo" })

    await fillAndSubmit("nuevaClave123")

    await waitFor(() => expect(updatePassword).toHaveBeenCalled())
    expect(completeForcedPasswordChange).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("no se pudo")
  })

  it("rejects mismatched passwords before touching the session", async () => {
    await fillAndSubmit("nuevaClave123", "otraClave123")

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Las contraseñas no coinciden"))
    expect(updatePassword).not.toHaveBeenCalled()
    expect(completeForcedPasswordChange).not.toHaveBeenCalled()
  })

  // A prior attempt can apply on the server while the client times out waiting for the
  // response — the retry then fails with "same_password" because the owner is already on
  // it. That must not trap them: treat it as the change having succeeded.
  it("lifts the flag when updatePassword fails with code 'same_password'", async () => {
    updatePassword.mockResolvedValue({ success: false, error: "same password", code: "same_password" })
    completeForcedPasswordChange.mockResolvedValue({ success: true })

    await fillAndSubmit("nuevaClave123")

    await waitFor(() => expect(updatePassword).toHaveBeenCalledWith("nuevaClave123"))
    await waitFor(() => expect(completeForcedPasswordChange).toHaveBeenCalledTimes(1))
    expect(toastError).not.toHaveBeenCalled()
  })

  it("does not lift the flag for a genuine failure without the 'same_password' code", async () => {
    updatePassword.mockResolvedValue({ success: false, error: "Timeout después de 30000ms en updatePassword" })

    await fillAndSubmit("nuevaClave123")

    await waitFor(() => expect(updatePassword).toHaveBeenCalled())
    expect(completeForcedPasswordChange).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith(
      "El cambio pudo haberse aplicado. Intenta de nuevo con la misma contraseña."
    )
  })
})
