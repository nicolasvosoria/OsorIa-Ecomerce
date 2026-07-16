import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockAddStoreMemberAction = vi.fn()

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

vi.mock("@/app/admin/users/actions", () => ({
  addStoreMemberAction: (...args: unknown[]) => mockAddStoreMemberAction(...args),
}))

import { AddMemberDialog } from "@/app/admin/users/components/add-member-dialog"

async function renderAndOpenDialog() {
  const user = userEvent.setup()
  render(<AddMemberDialog />)

  await user.click(screen.getByRole("button", { name: "Agregar miembro" }))
  const dialog = await screen.findByRole("dialog")

  return { user, dialog }
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  dialog: HTMLElement,
  email: string,
) {
  await user.type(within(dialog).getByLabelText("Correo del usuario"), email)
  await user.click(within(dialog).getByRole("button", { name: "Agregar miembro" }))
}

describe("AddMemberDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("stays closed until the trigger button is clicked", () => {
    render(<AddMemberDialog />)

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("opens the modal with an accessible title when the trigger is clicked", async () => {
    await renderAndOpenDialog()

    expect(screen.getByRole("heading", { name: "Agregar miembro" })).toBeInTheDocument()
  })

  it("closes the modal and refreshes when the invite succeeds", async () => {
    mockAddStoreMemberAction.mockResolvedValue({ success: true })
    const { user, dialog } = await renderAndOpenDialog()

    await fillAndSubmit(user, dialog, "nuevo@correo.com")

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Miembro agregado al equipo"))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  })

  it("keeps the modal open and reveals the temporary password when a new identity is minted", async () => {
    mockAddStoreMemberAction.mockResolvedValue({
      success: true,
      created: true,
      tempPassword: "aVeryStrongTempPassword",
    })
    const { user, dialog } = await renderAndOpenDialog()

    await fillAndSubmit(user, dialog, "nuevo-dueno@correo.com")

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Cuenta creada. Comparte la contraseña temporal.",
      ),
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByDisplayValue("aVeryStrongTempPassword")).toBeInTheDocument()
  })

  it("keeps the modal open and shows the real error when the invite fails", async () => {
    mockAddStoreMemberAction.mockResolvedValue({
      success: false,
      error: "Este correo ya pertenece al equipo",
    })
    const { user, dialog } = await renderAndOpenDialog()

    await fillAndSubmit(user, dialog, "existente@correo.com")

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Este correo ya pertenece al equipo"),
    )
    expect(mockToastSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })
})
