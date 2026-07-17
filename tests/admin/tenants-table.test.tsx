import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { grantSelfSupportAccessAction, setActiveStore, setTenantPublication, toastSuccess, toastError } =
  vi.hoisted(() => ({
    grantSelfSupportAccessAction: vi.fn(),
    setActiveStore: vi.fn(),
    setTenantPublication: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
  }))

vi.mock("sonner", () => ({ toast: { success: toastSuccess, error: toastError } }))
vi.mock("@/app/(platform)/admin/stores/actions", () => ({ grantSelfSupportAccessAction }))
vi.mock("@/app/admin/actions/active-store", () => ({ setActiveStore }))
vi.mock("@/app/admin/actions/store-publication", () => ({ setTenantPublication }))

import {
  TenantsTable,
  type TenantRow,
} from "@/app/(platform)/admin/stores/components/tenants-table"
import { formatPrice } from "@/lib/commerce/utils"

function tenantRow(overrides: Partial<TenantRow>): TenantRow {
  return {
    id: "store-1",
    store_name: "Tienda Uno",
    subdomain: "uno",
    is_active: true,
    is_public: true,
    created_at: null,
    currency_code: "COP",
    productCount: 0,
    orderCount: 0,
    revenue: 0,
    lastOrderAt: null,
    memberCount: 0,
    ...overrides,
  }
}

const rows = [
  tenantRow({
    created_at: "2024-01-15T00:00:00.000Z",
    currency_code: "COP",
    revenue: 15000,
    lastOrderAt: "2024-03-10T00:00:00.000Z",
    memberCount: 3,
  }),
  tenantRow({
    id: "store-2",
    store_name: "Tienda Dos",
    subdomain: "dos",
    created_at: "2024-02-20T00:00:00.000Z",
    currency_code: "EUR",
    revenue: 500,
    lastOrderAt: null,
    memberCount: 1,
  }),
]

function formatTestDate(value: string) {
  return new Date(value).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// RTL collapses every run of (Unicode-aware) whitespace in rendered text down to
// a single regular space before matching, including the narrow no-break space
// Intl.NumberFormat inserts after a currency symbol — normalize the same way so
// the expected string actually matches the rendered node.
function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim()
}

function renderTable() {
  render(<TenantsTable rows={rows} state="ready" managedStoreIds={["store-1"]} />)
}

function rowOf(storeName: string) {
  return screen.getByText(storeName).closest("tr") as HTMLElement
}

async function openSupportDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(within(rowOf("Tienda Dos")).getByRole("button", { name: /Obtener acceso/ }))
  return await screen.findByRole("alertdialog")
}

describe("TenantsTable membership flip (D3)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("offers 'Entrar a tienda' only where the super_admin is a member, 'Obtener acceso' elsewhere", () => {
    renderTable()

    const memberRow = rowOf("Tienda Uno")
    expect(within(memberRow).getByRole("button", { name: /Entrar a tienda/ })).toBeEnabled()
    expect(within(memberRow).queryByText("Obtener acceso")).not.toBeInTheDocument()

    const strangerRow = rowOf("Tienda Dos")
    expect(within(strangerRow).getByRole("button", { name: /Obtener acceso/ })).toBeEnabled()
    expect(within(strangerRow).queryByText("Entrar a tienda")).not.toBeInTheDocument()
  })

  it("warns that the membership will be visible to the store team before granting anything", async () => {
    const user = userEvent.setup()
    renderTable()

    const dialog = await openSupportDialog(user)

    expect(within(dialog).getByText(/la verá como acceso de soporte/)).toBeInTheDocument()
    expect(within(dialog).getByText(/podrá revocarla/)).toBeInTheDocument()
    expect(grantSelfSupportAccessAction).not.toHaveBeenCalled()
  })

  it("grants the membership for that store only after confirming", async () => {
    grantSelfSupportAccessAction.mockResolvedValue({ success: true })
    const user = userEvent.setup()
    renderTable()

    const dialog = await openSupportDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Obtener acceso" }))

    await waitFor(() => expect(grantSelfSupportAccessAction).toHaveBeenCalledWith("store-2"))
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith("Ya tienes acceso de soporte en Tienda Dos"),
    )
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument())
  })

  it("keeps the dialog open and shows the real error when the grant fails", async () => {
    grantSelfSupportAccessAction.mockResolvedValue({ success: false, error: "Acceso denegado" })
    const user = userEvent.setup()
    renderTable()

    const dialog = await openSupportDialog(user)
    await user.click(within(dialog).getByRole("button", { name: "Obtener acceso" }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Acceso denegado"))
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })
})

describe("TenantsTable operational columns (D6)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows creation date, currency and team size per store", () => {
    renderTable()

    const tiendaUnoRow = rowOf("Tienda Uno")
    const createdAt = formatTestDate("2024-01-15T00:00:00.000Z")
    expect(within(tiendaUnoRow).getByText(createdAt)).toBeInTheDocument()
    expect(within(tiendaUnoRow).getByText("COP")).toBeInTheDocument()
    expect(within(tiendaUnoRow).getByText("3")).toBeInTheDocument()
  })

  it("formats revenue with each store's own currency, not a generic one", () => {
    renderTable()

    const copRow = rowOf("Tienda Uno")
    expect(within(copRow).getByText(normalizeText(formatPrice(15000, "COP")))).toBeInTheDocument()

    const eurRow = rowOf("Tienda Dos")
    expect(within(eurRow).getByText(normalizeText(formatPrice(500, "EUR")))).toBeInTheDocument()
  })

  it("shows a dash for last order when the store never received one", () => {
    renderTable()

    const neverOrderedRow = rowOf("Tienda Dos")
    expect(within(neverOrderedRow).getByText("—")).toBeInTheDocument()

    const orderedRow = rowOf("Tienda Uno")
    expect(
      within(orderedRow).getByText(formatTestDate("2024-03-10T00:00:00.000Z")),
    ).toBeInTheDocument()
  })
})

describe("TenantsTable detail link (D6)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("links the store name to its detail page", () => {
    renderTable()

    const link = screen.getByRole("link", { name: /Tienda Uno/ })
    expect(link).toHaveAttribute("href", "/admin/stores/store-1")
  })
})
