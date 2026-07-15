import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Trash2 } from "lucide-react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
import type { AdminActionResult } from "@/lib/admin/action-result"

async function renderAndOpenConfirmDialog(onConfirm: () => Promise<AdminActionResult>) {
  const user = userEvent.setup()
  render(
    <ConfirmActionButton
      onConfirm={onConfirm}
      icon={Trash2}
      triggerAriaLabel="Eliminar combo de prueba"
      title="¿Eliminar este combo?"
      description="Se eliminará permanentemente."
      confirmLabel="Eliminar"
      successMessage="Combo eliminado"
      errorFallbackMessage="No se pudo eliminar el combo"
    />,
  )

  await user.click(screen.getByRole("button", { name: "Eliminar combo de prueba" }))
  await screen.findByRole("alertdialog")

  return user
}

describe("ConfirmActionButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("opens the confirmation dialog with the caller's copy", async () => {
    await renderAndOpenConfirmDialog(vi.fn())

    expect(screen.getByText("¿Eliminar este combo?")).toBeInTheDocument()
    expect(screen.getByText("Se eliminará permanentemente.")).toBeInTheDocument()
  })

  // Key D13 regression: a delete blocked by a business rule must reach the
  // user as its own message, not the caller's hardcoded generic fallback.
  it("shows the action's own error message instead of the generic fallback, and keeps the dialog open", async () => {
    const onConfirm = vi.fn().mockResolvedValue({
      success: false,
      error: "Este combo está referenciado en un pedido activo",
    })
    const user = await renderAndOpenConfirmDialog(onConfirm)

    await user.click(screen.getByRole("button", { name: "Eliminar" }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith(
        "Este combo está referenciado en un pedido activo",
      ),
    )
    expect(mockToastSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("falls back to the caller's generic message when the action fails without one", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ success: false })
    const user = await renderAndOpenConfirmDialog(onConfirm)

    await user.click(screen.getByRole("button", { name: "Eliminar" }))

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("No se pudo eliminar el combo"),
    )
  })

  it("shows a success toast and closes the dialog when the action succeeds", async () => {
    const onConfirm = vi.fn().mockResolvedValue({ success: true })
    const user = await renderAndOpenConfirmDialog(onConfirm)

    await user.click(screen.getByRole("button", { name: "Eliminar" }))

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Combo eliminado"))
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
  })
})
