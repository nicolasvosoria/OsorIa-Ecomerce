import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { saveAccountProfile, toastError, toastSuccess } = vi.hoisted(() => ({
  saveAccountProfile: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}))

vi.mock("@/app/auth/cuenta/actions", () => ({
  saveAccountProfile,
  createSavedAddress: vi.fn(),
  updateSavedAddress: vi.fn(),
  deleteSavedAddress: vi.fn(),
  setDefaultSavedAddress: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))

import { ProfileForm } from "@/app/auth/cuenta/profile-form"
import { LanguageProvider } from "@/contexts/language-context"
import type { AccountProfile } from "@/lib/account/schemas"
import { translations } from "@/lib/i18n/translations"

const t = translations.es

const EMPTY_PROFILE: AccountProfile = { firstName: null, lastName: null, phone: null }

function renderProfileForm(profile: AccountProfile) {
  return render(
    <LanguageProvider>
      <ProfileForm profile={profile} />
    </LanguageProvider>,
  )
}

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    saveAccountProfile.mockResolvedValue({ success: true })
  })

  // D22: quien todavía no tiene fila de perfil ve el formulario vacío y
  // rellenable, no un error.
  it("starts empty for someone whose profile row does not exist yet", () => {
    renderProfileForm(EMPTY_PROFILE)

    expect(screen.getByLabelText(t.auth.firstName)).toHaveValue("")
    expect(screen.getByLabelText(t.auth.phone)).toHaveValue("")
  })

  it("shows the name and phone already saved", () => {
    renderProfileForm({ firstName: "Ana", lastName: "Osorio", phone: "3001234567" })

    expect(screen.getByLabelText(t.auth.firstName)).toHaveValue("Ana")
    expect(screen.getByLabelText(t.auth.lastName)).toHaveValue("Osorio")
    expect(screen.getByLabelText(t.auth.phone)).toHaveValue("3001234567")
  })

  // A1: el teléfono es del perfil, no de la dirección.
  it("saves the typed name and phone together", async () => {
    const user = userEvent.setup()
    renderProfileForm(EMPTY_PROFILE)

    await user.type(screen.getByLabelText(t.auth.firstName), "Ana")
    await user.type(screen.getByLabelText(t.auth.lastName), "Osorio")
    await user.type(screen.getByLabelText(t.auth.phone), "3001234567")
    await user.click(screen.getByRole("button", { name: t.common.save }))

    await waitFor(() =>
      expect(saveAccountProfile).toHaveBeenCalledWith({
        firstName: "Ana",
        lastName: "Osorio",
        phone: "3001234567",
      }),
    )
    expect(toastSuccess).toHaveBeenCalledWith(t.account.profileSaved)
  })

  it("names the reason the save failed instead of a generic message", async () => {
    const user = userEvent.setup()
    saveAccountProfile.mockResolvedValue({
      success: false,
      error: "permission denied for user_profiles",
    })
    renderProfileForm(EMPTY_PROFILE)

    await user.type(screen.getByLabelText(t.auth.firstName), "Ana")
    await user.click(screen.getByRole("button", { name: t.common.save }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        t.account.saveFailed,
        expect.objectContaining({ description: "permission denied for user_profiles" }),
      ),
    )
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  // D18: el correo identifica la cuenta y no se edita desde aquí.
  it("offers no field for the email", () => {
    renderProfileForm(EMPTY_PROFILE)

    expect(screen.queryByLabelText(t.auth.email)).toBeNull()
  })
})
