import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { requestMailboxVerification, updateStoreIdentityFields, toastSuccess, toastError } = vi.hoisted(() => ({
  requestMailboxVerification: vi.fn(),
  updateStoreIdentityFields: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }))
vi.mock("@/app/admin/actions/store-identity", () => ({ requestMailboxVerification, updateStoreIdentityFields }))

import { StoreIdentityPanel } from "@/app/admin/settings/components/store-identity-panel"
import type { StoreIdentityView } from "@/lib/supabase/store-identity-api"

const INCOMPLETE_IDENTITY: StoreIdentityView = {
  displayName: "Cumbre Dorada Café",
  legalName: null,
  logoUrl: "https://cdn.example.com/logo.png",
  primaryColor: "#5daba8",
  phone: null,
  commercialAddress: null,
  subdomain: "cumbre-dorada",
  contactEmail: null,
  replyToEmail: null,
  replyToPendingEmail: null,
  replyToVerifiedAt: null,
  orderMailboxEmail: "pedidos@cumbre.example",
  orderMailboxPendingEmail: null,
  orderMailboxVerifiedAt: "2026-08-01T00:00:00.000Z",
}

// The checklist label and the form's <Label> can share the same word (e.g.
// "Razón social" appears both in the readiness list and as a field label),
// so this narrows to the match that actually sits inside a checklist <li>.
function readinessIconClass(fieldLabel: string): string {
  const item = screen.getAllByText(fieldLabel).map((node) => node.closest("li")).find(Boolean)
  return item?.querySelector("svg")?.getAttribute("class") ?? ""
}

describe("StoreIdentityPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("marks a field ready with the success icon and a missing field with the dashed icon", () => {
    render(<StoreIdentityPanel initial={INCOMPLETE_IDENTITY} />)

    expect(readinessIconClass("Nombre público")).toContain("text-success")
    expect(readinessIconClass("Razón social")).toContain("text-muted-foreground")
    expect(readinessIconClass("Buzón de pedidos verificado")).toContain("text-success")
    expect(readinessIconClass("Correo de respuesta verificado")).toContain("text-muted-foreground")
  })

  it("shows the verified badge only for the mailbox that actually has a verified_at, never from the address alone", () => {
    render(<StoreIdentityPanel initial={INCOMPLETE_IDENTITY} />)

    expect(screen.getByText("Verificado")).toBeInTheDocument()
    expect(screen.getByText("Sin configurar")).toBeInTheDocument()
  })

  it("saves legal name, phone and address through updateStoreIdentityFields", async () => {
    updateStoreIdentityFields.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    render(<StoreIdentityPanel initial={INCOMPLETE_IDENTITY} />)

    await user.type(screen.getByLabelText("Razón social"), "Cumbre Dorada S.A.S.")
    await user.type(screen.getByLabelText("Teléfono"), "3000000000")
    await user.type(screen.getByLabelText("Dirección comercial"), "Bogotá, Colombia")
    await user.click(screen.getByRole("button", { name: "Guardar identidad" }))

    await waitFor(() =>
      expect(updateStoreIdentityFields).toHaveBeenCalledWith({
        legalName: "Cumbre Dorada S.A.S.",
        phone: "3000000000",
        commercialAddress: "Bogotá, Colombia",
      }),
    )
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
  })

  it("requests reply-to verification for the address the owner typed, and reports a failure via toast", async () => {
    requestMailboxVerification.mockResolvedValue({ success: false, error: "Ingresa un correo válido." })
    const user = userEvent.setup()
    render(<StoreIdentityPanel initial={INCOMPLETE_IDENTITY} />)

    const [replyToInput] = screen.getAllByPlaceholderText("correo@tutienda.com")
    await user.type(replyToInput, "hola@cumbre.example")
    await user.click(screen.getAllByRole("button", { name: "Enviar enlace de verificación" })[0])

    await waitFor(() =>
      expect(requestMailboxVerification).toHaveBeenCalledWith({ field: "reply_to", email: "hola@cumbre.example" }),
    )
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Ingresa un correo válido."))
  })
})
