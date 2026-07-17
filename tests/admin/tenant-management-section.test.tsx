import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { StoreMember } from "@/lib/supabase/memberships-api"
import type { TenantDetail, TenantSummary } from "@/lib/supabase/stores-admin-api"

const {
  authorizeSuperAdmin,
  getTenantById,
  getTenantDetail,
  listStoreOwners,
  notFound,
  redirect,
  resetOwnerCredentialAction,
  routerPush,
  setTenantActive,
  softDeleteTenant,
  toastError,
  toastSuccess,
  toastWarning,
  updateTenantSettings,
} = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  getTenantById: vi.fn(),
  getTenantDetail: vi.fn(),
  listStoreOwners: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT")
  }),
  resetOwnerCredentialAction: vi.fn(),
  routerPush: vi.fn(),
  setTenantActive: vi.fn(),
  softDeleteTenant: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  toastWarning: vi.fn(),
  updateTenantSettings: vi.fn(),
}))

vi.mock("sonner", () => ({
  toast: { success: toastSuccess, error: toastError, warning: toastWarning },
}))
vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/stores-admin-api", () => ({ getTenantById, getTenantDetail }))
vi.mock("@/lib/supabase/memberships-api", () => ({ listStoreOwners }))
vi.mock("@/app/(platform)/admin/stores/actions", () => ({ resetOwnerCredentialAction }))
vi.mock("@/app/(platform)/admin/stores/tenant-lifecycle-actions", () => ({
  setTenantActive,
  softDeleteTenant,
  updateTenantSettings,
}))
vi.mock("next/navigation", () => ({
  notFound,
  redirect,
  usePathname: () => "/tenant-id",
  useRouter: () => ({ push: routerPush }),
}))

import TenantDetailPage from "@/app/(platform)/admin/stores/[id]/page"

const TENANT: TenantSummary = {
  id: "9b1b807c-de03-438f-a92a-349b9aa64c11",
  store_name: "Tienda Principal",
  subdomain: "tienda-principal",
  is_active: true,
  is_public: true,
  created_at: "2025-12-30T13:12:46.123Z",
  currency_code: "COP",
}

const DETAIL: TenantDetail = {
  ordersByStatus: {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
  },
  ordersByPaymentStatus: { pending: 0, paid: 0, failed: 0, refunded: 0, cancelled: 0 },
  revenue: 0,
  lastOrderAt: null,
  totalItemCount: 0,
  activeItemCount: 0,
  cartsByStatus: { active: 0, abandoned: 0, expired: 0 },
  memberCount: 1,
  themeName: null,
  isThemeCustom: false,
  hasBranding: false,
}

const OWNER: StoreMember = {
  userId: "owner-1",
  email: "duena@correo.com",
  name: "Ana Pérez",
  role: "owner",
  isSupportAccess: false,
}

async function renderPage(tenant: TenantSummary = TENANT, owners: StoreMember[] = [OWNER]) {
  getTenantById.mockResolvedValue(tenant)
  listStoreOwners.mockResolvedValue(owners)
  render(await TenantDetailPage({ params: Promise.resolve({ id: tenant.id }) }))
}

describe("TenantActiveToggle (D7a)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })
    getTenantDetail.mockResolvedValue(DETAIL)
  })

  it("offers Suspender for an active store and explains storefront-vs-admin before confirming", async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: "Suspender" }))
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByText(/dejará de mostrar la tienda/)).toBeInTheDocument()
    expect(within(dialog).getByText(/seguirá entrando a \/admin/)).toBeInTheDocument()
    expect(setTenantActive).not.toHaveBeenCalled()
  })

  it("suspends the active store only after confirming", async () => {
    setTenantActive.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: "Suspender" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Suspender" }))

    await waitFor(() => expect(setTenantActive).toHaveBeenCalledWith(TENANT.id, false))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Tienda Principal suspendida"))
  })

  it("offers Reactivar for a suspended store", async () => {
    const user = userEvent.setup()
    await renderPage({ ...TENANT, is_active: false })

    await user.click(screen.getByRole("button", { name: "Reactivar" }))
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByText(/volverá a servir la tienda/)).toBeInTheDocument()
  })

  it("keeps the dialog open and surfaces the real error when the toggle fails", async () => {
    setTenantActive.mockResolvedValue({ success: false, error: "Acceso denegado" })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: "Suspender" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Suspender" }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Acceso denegado"))
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })
})

describe("TenantSettingsForm (D7b)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })
    getTenantDetail.mockResolvedValue(DETAIL)
  })

  it("never renders a subdomain field: only name and currency are editable", async () => {
    await renderPage()

    expect(screen.getByLabelText("Nombre de la tienda")).toHaveValue(TENANT.store_name)
    expect(screen.getByLabelText("Moneda")).toHaveValue(TENANT.currency_code)
    expect(screen.queryByLabelText(/subdominio/i)).not.toBeInTheDocument()
  })

  it("saves the edited name and currency", async () => {
    updateTenantSettings.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    await renderPage()

    await user.clear(screen.getByLabelText("Nombre de la tienda"))
    await user.type(screen.getByLabelText("Nombre de la tienda"), "Tienda Renombrada")
    await user.clear(screen.getByLabelText("Moneda"))
    await user.type(screen.getByLabelText("Moneda"), "USD")
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))

    await waitFor(() =>
      expect(updateTenantSettings).toHaveBeenCalledWith(TENANT.id, {
        storeName: "Tienda Renombrada",
        currencyCode: "USD",
      }),
    )
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Tienda actualizada"))
  })

  it("rejects an invalid currency client-side before ever calling the action", async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.clear(screen.getByLabelText("Moneda"))
    await user.type(screen.getByLabelText("Moneda"), "pesos")
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }))

    expect(await screen.findByText(/Usa un código ISO de 3 letras/i)).toBeInTheDocument()
    expect(updateTenantSettings).not.toHaveBeenCalled()
  })
})

describe("DeleteTenantButton (D7c)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })
    getTenantDetail.mockResolvedValue(DETAIL)
  })

  it("explains the consequences and keeps the confirm button disabled until typed", async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: "Eliminar tienda" }))
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByText(/desaparece de esta consola/)).toBeInTheDocument()
    expect(within(dialog).getByText(/dominio deja de servirla/)).toBeInTheDocument()
    expect(within(dialog).getByText(/recuperación es manual/)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Eliminar tienda" })).toBeDisabled()
  })

  it("keeps the confirm button disabled while the typed subdomain does not match", async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: "Eliminar tienda" }))
    const dialog = await screen.findByRole("alertdialog")

    await user.type(within(dialog).getByRole("textbox"), "not-the-subdomain")

    expect(within(dialog).getByRole("button", { name: "Eliminar tienda" })).toBeDisabled()
    expect(softDeleteTenant).not.toHaveBeenCalled()
  })

  it("enables the confirm button only once the exact subdomain is typed, then deletes and leaves the page", async () => {
    softDeleteTenant.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: "Eliminar tienda" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByRole("textbox"), TENANT.subdomain)

    const confirmButton = within(dialog).getByRole("button", { name: "Eliminar tienda" })
    expect(confirmButton).toBeEnabled()

    await user.click(confirmButton)

    await waitFor(() =>
      expect(softDeleteTenant).toHaveBeenCalledWith(TENANT.id, TENANT.subdomain),
    )
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith("/admin/stores"))
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(`${TENANT.store_name} eliminada`),
    )
  })

  it("keeps the dialog open and surfaces the real error when the delete fails", async () => {
    softDeleteTenant.mockResolvedValue({ success: false, error: "El subdominio no coincide" })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: "Eliminar tienda" }))
    const dialog = await screen.findByRole("alertdialog")
    await user.type(within(dialog).getByRole("textbox"), TENANT.subdomain)
    await user.click(within(dialog).getByRole("button", { name: "Eliminar tienda" }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("El subdominio no coincide"))
    expect(routerPush).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })
})

describe("ResetOwnerCredentialButton (D7 soporte)", () => {
  const RESET_TRIGGER = "Restablecer credencial del dueño"

  beforeEach(() => {
    vi.clearAllMocks()
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })
    getTenantDetail.mockResolvedValue(DETAIL)
  })

  it("names the owner and warns the credential is the shared platform sign-in before confirming", async () => {
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: RESET_TRIGGER }))
    const dialog = await screen.findByRole("alertdialog")

    expect(within(dialog).getByText(/duena@correo\.com/)).toBeInTheDocument()
    expect(within(dialog).getByText(/cuenta de la plataforma/)).toBeInTheDocument()
    expect(within(dialog).getByText(/contraseña actual dejará de funcionar/)).toBeInTheDocument()
    expect(within(dialog).getByText(/próximo inicio de sesión/)).toBeInTheDocument()
    expect(resetOwnerCredentialAction).not.toHaveBeenCalled()
  })

  it("resets after confirming and shows the one-time temporary password", async () => {
    resetOwnerCredentialAction.mockResolvedValue({
      success: true,
      tempPassword: "temp-secret-24",
      ownerEmail: "duena@correo.com",
      flagWarning: null,
    })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: RESET_TRIGGER }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Restablecer credencial" }))

    await waitFor(() => expect(resetOwnerCredentialAction).toHaveBeenCalledWith(TENANT.id))
    expect(await screen.findByDisplayValue("temp-secret-24")).toBeInTheDocument()
    expect(screen.getByText("Contraseña temporal del dueño")).toBeInTheDocument()
    expect(screen.getByText(/No se volverá a mostrar/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
  })

  it("still reveals the password and warns when the flag write failed after the change", async () => {
    resetOwnerCredentialAction.mockResolvedValue({
      success: true,
      tempPassword: "temp-secret-24",
      ownerEmail: "duena@correo.com",
      flagWarning: "La contraseña sí se restableció y la anterior ya no funciona, pero...",
    })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: RESET_TRIGGER }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Restablecer credencial" }))

    expect(await screen.findByDisplayValue("temp-secret-24")).toBeInTheDocument()
    await waitFor(() =>
      expect(toastWarning).toHaveBeenCalledWith(
        expect.stringContaining("sí se restableció"),
      ),
    )
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it("surfaces the error and reveals nothing when the reset fails", async () => {
    resetOwnerCredentialAction.mockResolvedValue({
      success: false,
      error: "La tienda tiene más de un dueño y esta acción solo admite uno.",
    })
    const user = userEvent.setup()
    await renderPage()

    await user.click(screen.getByRole("button", { name: RESET_TRIGGER }))
    const dialog = await screen.findByRole("alertdialog")
    await user.click(within(dialog).getByRole("button", { name: "Restablecer credencial" }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith(
        "La tienda tiene más de un dueño y esta acción solo admite uno.",
      ),
    )
    expect(screen.queryByText("Contraseña temporal del dueño")).not.toBeInTheDocument()
  })

  it("offers no reset when the store has no owner, saying why", async () => {
    await renderPage(TENANT, [])

    expect(screen.queryByRole("button", { name: RESET_TRIGGER })).not.toBeInTheDocument()
    expect(screen.getByText(/no tiene ningún miembro con rol de dueño/)).toBeInTheDocument()
  })

  it("offers no reset when the store has several owners, saying why", async () => {
    await renderPage(TENANT, [OWNER, { ...OWNER, userId: "owner-2", email: "otra@correo.com" }])

    expect(screen.queryByRole("button", { name: RESET_TRIGGER })).not.toBeInTheDocument()
    expect(screen.getByText(/más de un dueño/)).toBeInTheDocument()
  })
})
