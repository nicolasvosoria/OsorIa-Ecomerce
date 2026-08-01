import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { changeOwnPassword, toastError, toastSuccess } = vi.hoisted(() => ({
  changeOwnPassword: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("@/lib/supabase/auth-api", () => ({ changeOwnPassword }))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
// Las actions de la cuenta son un módulo "use server": esta suite solo mira el
// formulario de contraseña, así que se aíslan igual que changeOwnPassword.
vi.mock("@/app/auth/cuenta/actions", () => ({
  saveAccountProfile: vi.fn(),
  createSavedAddress: vi.fn(),
  updateSavedAddress: vi.fn(),
  deleteSavedAddress: vi.fn(),
  setDefaultSavedAddress: vi.fn(),
}))

import { AccountPageClient } from "@/app/auth/cuenta/account-page-client"
import { LanguageProvider } from "@/contexts/language-context"
import { translations } from "@/lib/i18n/translations"

const t = translations.es

const SIGNED_IN_VIEW = {
  authenticated: true,
  email: "duena@tienda.test",
  profile: { firstName: null, lastName: null, phone: null },
  addresses: [],
} as const satisfies Parameters<typeof AccountPageClient>[0]["view"]

function renderAccount(view: Parameters<typeof AccountPageClient>[0]["view"]) {
  return render(
    <LanguageProvider>
      <AccountPageClient view={view} />
    </LanguageProvider>,
  )
}

async function submitPasswordChange({
  currentPassword,
  newPassword,
  confirmation,
}: {
  currentPassword: string
  newPassword: string
  confirmation: string
}) {
  const user = userEvent.setup()
  renderAccount(SIGNED_IN_VIEW)

  await user.type(screen.getByLabelText(t.account.currentPassword), currentPassword)
  await user.type(screen.getByLabelText(t.passwordReset.newPassword), newPassword)
  await user.type(screen.getByLabelText(t.auth.confirmPassword), confirmation)
  await user.click(screen.getByRole("button", { name: t.account.changePassword }))
}

function describedByText(control: HTMLElement): string[] {
  const ids = control.getAttribute("aria-describedby")?.split(" ") ?? []
  return ids.map((id) => document.getElementById(id)?.textContent ?? "")
}

describe("AccountPageClient", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // La sesión la resuelve el servidor (loadAccountPageView); sin ella la
  // pantalla no puede ofrecer el cambio de contraseña, solo el camino de vuelta.
  it("gives a signed-out visitor no password form at all", () => {
    renderAccount({ authenticated: false })

    expect(screen.queryByLabelText(t.account.currentPassword)).toBeNull()
    expect(screen.queryByRole("button", { name: t.account.changePassword })).toBeNull()
    expect(screen.getByRole("link", { name: t.auth.login })).toHaveAttribute("href", "/auth/login")
  })

  it("gives the signed-in account a single page heading and its fixed email", () => {
    renderAccount(SIGNED_IN_VIEW)

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(t.account.title)
    expect(screen.getByText("duena@tienda.test")).toBeInTheDocument()
    expect(screen.getByText(t.account.emailFixed)).toBeInTheDocument()
  })

  // `CardTitle` pinta un <div>: sin rol de encabezado, quien navega por
  // encabezados aterrizaba en el <h1> y no tenía forma de saltar a ninguna
  // sección, ni siquiera al formulario de contraseña.
  it("exposes every section title as a level-2 heading under the page heading", () => {
    renderAccount(SIGNED_IN_VIEW)

    const sections = screen
      .getAllByRole("heading", { level: 2 })
      .map((heading) => heading.textContent)
    expect(sections).toEqual([
      t.auth.email,
      t.account.profileTitle,
      t.account.ordersTitle,
      t.account.addressesTitle,
      t.auth.password,
    ])
  })

  // D18: el correo se declara fijo, así que no puede existir un campo editable.
  it("offers no editable field for the email", () => {
    renderAccount(SIGNED_IN_VIEW)

    expect(screen.queryByLabelText(t.auth.email)).toBeNull()
  })

  it("rejects a mismatched confirmation before any network call", async () => {
    await submitPasswordChange({
      currentPassword: "la-de-hoy",
      newPassword: "unaClaveNueva123",
      confirmation: "otraClaveNueva123",
    })

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(t.header.passwordsDoNotMatch))
    expect(changeOwnPassword).not.toHaveBeenCalled()
  })

  it("rejects a new password shorter than the minimum before any network call", async () => {
    await submitPasswordChange({
      currentPassword: "la-de-hoy",
      newPassword: "corta",
      confirmation: "corta",
    })

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(t.header.passwordMinLength))
    expect(changeOwnPassword).not.toHaveBeenCalled()
  })

  it("requires the current password before any network call", async () => {
    const user = userEvent.setup()
    renderAccount(SIGNED_IN_VIEW)

    await user.type(screen.getByLabelText(t.passwordReset.newPassword), "unaClaveNueva123")
    await user.type(screen.getByLabelText(t.auth.confirmPassword), "unaClaveNueva123")
    await user.click(screen.getByRole("button", { name: t.account.changePassword }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(t.header.incompleteFieldsDescription),
    )
    expect(changeOwnPassword).not.toHaveBeenCalled()
  })

  it("names the wrong current password instead of a generic failure", async () => {
    changeOwnPassword.mockResolvedValue({ success: false, reason: "wrongCurrentPassword" })

    await submitPasswordChange({
      currentPassword: "la-que-no-es",
      newPassword: "unaClaveNueva123",
      confirmation: "unaClaveNueva123",
    })

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        t.passwordReset.updateFailed,
        expect.objectContaining({ description: t.account.wrongCurrentPassword }),
      ),
    )
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("sends both passwords together so the change can be proven before it applies", async () => {
    changeOwnPassword.mockResolvedValue({ success: true })

    await submitPasswordChange({
      currentPassword: "la-de-hoy",
      newPassword: "unaClaveNueva123",
      confirmation: "unaClaveNueva123",
    })

    await waitFor(() =>
      expect(changeOwnPassword).toHaveBeenCalledWith({
        currentPassword: "la-de-hoy",
        newPassword: "unaClaveNueva123",
      }),
    )
    expect(toastSuccess).toHaveBeenCalledWith(
      t.account.passwordChanged,
      expect.objectContaining({ description: t.account.passwordChangedHint }),
    )
  })

  it("clears the typed credentials once the change lands", async () => {
    changeOwnPassword.mockResolvedValue({ success: true })

    await submitPasswordChange({
      currentPassword: "la-de-hoy",
      newPassword: "unaClaveNueva123",
      confirmation: "unaClaveNueva123",
    })

    await waitFor(() =>
      expect(screen.getByLabelText(t.account.currentPassword)).toHaveValue(""),
    )
    expect(screen.getByLabelText(t.passwordReset.newPassword)).toHaveValue("")
  })
})

// El toast aparece lejos del formulario y se va solo: con tres campos de
// contraseña, un aviso que no dice cuál falló no se puede corregir.
describe("password change field errors", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("marks the confirmation invalid and describes why when the passwords differ", async () => {
    await submitPasswordChange({
      currentPassword: "la-de-hoy",
      newPassword: "unaClaveNueva123",
      confirmation: "otraClaveNueva123",
    })

    const confirmation = screen.getByLabelText(t.auth.confirmPassword)
    await waitFor(() => expect(confirmation).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(confirmation)).toContain(t.header.passwordsDoNotMatch)
    expect(screen.getByLabelText(t.account.currentPassword)).not.toHaveAttribute("aria-invalid")
  })

  it("marks the new password invalid and describes why when it is too short", async () => {
    await submitPasswordChange({
      currentPassword: "la-de-hoy",
      newPassword: "corta",
      confirmation: "corta",
    })

    const newPassword = screen.getByLabelText(t.passwordReset.newPassword)
    await waitFor(() => expect(newPassword).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(newPassword)).toContain(t.header.passwordMinLength)
    expect(screen.getByLabelText(t.auth.confirmPassword)).not.toHaveAttribute("aria-invalid")
  })

  it("blames the current password when it is the only one missing", async () => {
    const user = userEvent.setup()
    renderAccount(SIGNED_IN_VIEW)

    await user.type(screen.getByLabelText(t.passwordReset.newPassword), "unaClaveNueva123")
    await user.type(screen.getByLabelText(t.auth.confirmPassword), "unaClaveNueva123")
    await user.click(screen.getByRole("button", { name: t.account.changePassword }))

    const currentPassword = screen.getByLabelText(t.account.currentPassword)
    await waitFor(() => expect(currentPassword).toHaveAttribute("aria-invalid", "true"))
    expect(describedByText(currentPassword)).toContain(t.header.incompleteFieldsDescription)
    expect(screen.getByLabelText(t.passwordReset.newPassword)).not.toHaveAttribute("aria-invalid")
  })

  it("clears the field errors once the three passwords are right", async () => {
    changeOwnPassword.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    renderAccount(SIGNED_IN_VIEW)

    await user.click(screen.getByRole("button", { name: t.account.changePassword }))
    await waitFor(() =>
      expect(screen.getByLabelText(t.account.currentPassword)).toHaveAttribute("aria-invalid"),
    )

    await user.type(screen.getByLabelText(t.account.currentPassword), "la-de-hoy")
    await user.type(screen.getByLabelText(t.passwordReset.newPassword), "unaClaveNueva123")
    await user.type(screen.getByLabelText(t.auth.confirmPassword), "unaClaveNueva123")
    await user.click(screen.getByRole("button", { name: t.account.changePassword }))

    await waitFor(() => expect(changeOwnPassword).toHaveBeenCalled())
    expect(screen.getByLabelText(t.account.currentPassword)).not.toHaveAttribute("aria-invalid")
    expect(screen.getByLabelText(t.auth.confirmPassword)).not.toHaveAttribute("aria-invalid")
  })
})
