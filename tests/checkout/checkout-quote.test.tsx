import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createContext, createElement, useContext, type ReactNode } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CheckoutShippingQuoteResult } from "@/app/checkout/actions"

// D25/D23: the checkout's live shipping quote -- department/municipality
// selection re-quotes through getCheckoutShippingQuote, the total follows
// the resolved amount, and a NEW payment attempt after changing destination
// must mint a NEW idempotency key (that's the whole point of D25; the old
// bug dead-ended on idempotency_conflict).
const placeCheckoutOrderMock = vi.hoisted(() => vi.fn())
const getCheckoutShippingQuoteMock = vi.hoisted(() => vi.fn())

const CART_ITEM_FIXTURE = [
  { id: "item-1", name: "Parlante Bluetooth", price: "100000", currencyCode: "COP", image: "", quantity: 1 },
]

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => createElement("a", { href }, children),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

vi.mock("@/contexts/cart-context", () => ({
  useCart: () => ({
    items: CART_ITEM_FIXTURE,
    hasHydrated: true,
    getItemSubtotal: () => 100000,
    getTotal: () => 100000,
  }),
}))
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, isLoading: false }),
}))
vi.mock("@/contexts/store-context", () => ({
  useStore: () => ({ store: null }),
}))
vi.mock("@/app/checkout/actions", () => ({
  placeCheckoutOrder: placeCheckoutOrderMock,
  getCheckoutPrefill: vi.fn().mockResolvedValue(null),
  getCheckoutStoreContactPhone: vi.fn().mockResolvedValue(null),
  getCheckoutShippingQuote: getCheckoutShippingQuoteMock,
}))

// Two municipalities under the SAME department -- switching between them
// (never the department itself) is what exercises "the buyer changes
// municipality" without also going through ShippingLocationPicker's
// department-change reset.
vi.mock("@/lib/shipping/locations-api", () => ({
  listDepartments: vi.fn().mockResolvedValue([{ code: "05", name: "Antioquia" }]),
  listMunicipalitiesByDepartment: vi.fn().mockResolvedValue([
    { id: 1, code: "05001", name: "Medellín", departmentCode: "05", departmentName: "Antioquia" },
    { id: 2, code: "05002", name: "Envigado", departmentCode: "05", departmentName: "Antioquia" },
  ]),
}))

// Real (Radix) selects only mount their SelectContent when open, which
// requires jsdom pointer-capture polyfills this suite doesn't set up --
// same harness tests/components/guest-checkout-form.test.tsx already uses.
const SelectContext = createContext<{ onValueChange?: (value: string) => void }>({})

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: ReactNode
    value?: string
    onValueChange?: (value: string) => void
  }) => createElement(SelectContext.Provider, { value: { onValueChange } }, children),
  SelectContent: ({ children }: { children: ReactNode }) => createElement("div", {}, children),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => {
    const { onValueChange } = useContext(SelectContext)
    return createElement("button", { type: "button", onClick: () => onValueChange?.(value) }, children)
  },
  SelectTrigger: ({ children, id }: { children: ReactNode; id?: string }) => createElement("div", { id }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => createElement("span", {}, placeholder),
}))

import CheckoutPage from "@/app/checkout/page"
import { CheckoutLoginIntentProvider } from "@/contexts/checkout-login-intent-context"
import { LanguageProvider } from "@/contexts/language-context"
import { formatPrice } from "@/lib/commerce/utils"
import { translations } from "@/lib/i18n/translations"

const t = translations.es.checkout
const buyerShippingLabels = translations.es.orders.shippingStatusLabels.buyer

function renderCheckoutPage() {
  render(
    <LanguageProvider>
      <CheckoutLoginIntentProvider>
        <CheckoutPage />
      </CheckoutLoginIntentProvider>
    </LanguageProvider>,
  )
}

function resolvedQuote(status: "agreed" | "rate" | "free" | "out_of_zone", amount: number): CheckoutShippingQuoteResult {
  return { ok: true, resolution: { status, amount } }
}

// getByText compares the RAW matcher string against the DOM's text after
// Testing Library's default normalizer collapses it -- which turns
// formatPrice's non-breaking space (Intl's currency spacing) into a regular
// one. Without this, every price assertion below silently never matches.
function price(amount: number) {
  return formatPrice(amount, "COP").replace(/ /g, " ")
}

async function selectDepartment() {
  fireEvent.click(await screen.findByText("Antioquia"))
}

async function selectMunicipality(name: "Medellín" | "Envigado") {
  fireEvent.click(await screen.findByText(name))
}

function fillRequiredContactAndAddressFields() {
  fireEvent.change(screen.getByLabelText("Nombre *"), { target: { value: "Ada" } })
  fireEvent.change(screen.getByLabelText("Apellido *"), { target: { value: "Lovelace" } })
  fireEvent.change(screen.getByLabelText("Correo Electrónico *"), { target: { value: "ada@example.com" } })
  fireEvent.change(screen.getByLabelText("Teléfono *"), { target: { value: "3001234567" } })
  fireEvent.change(screen.getByLabelText("Dirección *"), { target: { value: "Calle 123" } })
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  getCheckoutShippingQuoteMock.mockReset()
  placeCheckoutOrderMock.mockReset()
})

describe("Checkout quote: total before a destination is chosen", () => {
  it("shows no honest total yet -- a placeholder, never the subtotal standing in for it", async () => {
    renderCheckoutPage()

    expect(await screen.findByText(t.shippingSelectDestination)).toBeInTheDocument()
    // The subtotal row legitimately shows the cart's own $100.000 -- it's the
    // TOTAL row that must not, since there is no honest total yet.
    expect(screen.getByText(t.totalPendingShipping)).toBeInTheDocument()
  })
})

describe("Checkout quote: changing the municipality changes the amount and the total", () => {
  it("re-quotes and updates both the shipping row and the total when the municipality changes", async () => {
    getCheckoutShippingQuoteMock
      .mockResolvedValueOnce(resolvedQuote("rate", 15000))
      .mockResolvedValueOnce(resolvedQuote("rate", 25000))

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    await waitFor(() => expect(screen.getByText(price(15000))).toBeInTheDocument())
    expect(screen.getByText(price(115000))).toBeInTheDocument()

    await selectMunicipality("Envigado")

    await waitFor(() => expect(screen.getByText(price(25000))).toBeInTheDocument())
    expect(screen.getByText(price(125000))).toBeInTheDocument()
    expect(screen.queryByText(price(15000))).not.toBeInTheDocument()
    expect(screen.queryByText(price(115000))).not.toBeInTheDocument()
  })
})

describe("Checkout quote: the four resolution statuses each render their own treatment (D23/A15)", () => {
  it("agreed: shows the buyer-facing coordinate-with-the-store copy, not a number", async () => {
    getCheckoutShippingQuoteMock.mockResolvedValueOnce(resolvedQuote("agreed", 0))

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    expect(await screen.findByText(buyerShippingLabels.agreed)).toBeInTheDocument()
    // amount is 0, so the total equals the subtotal's own $100.000 -- the
    // real assertion is that the total row stopped showing the placeholder.
    expect(screen.queryByText(t.totalPendingShipping)).not.toBeInTheDocument()
  })

  it("rate: shows the resolved amount", async () => {
    getCheckoutShippingQuoteMock.mockResolvedValueOnce(resolvedQuote("rate", 12000))

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    expect(await screen.findByText(price(12000))).toBeInTheDocument()
    expect(screen.getByText(price(112000))).toBeInTheDocument()
  })

  it("free: shows the free-shipping word, not $0", async () => {
    getCheckoutShippingQuoteMock.mockResolvedValueOnce(resolvedQuote("free", 0))

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    expect(await screen.findByText(buyerShippingLabels.free)).toBeInTheDocument()
    // amount is 0, so the total equals the subtotal's own $100.000 -- the
    // real assertion is that the total row stopped showing the placeholder.
    expect(screen.queryByText(t.totalPendingShipping)).not.toBeInTheDocument()
  })

  // A15: buyer-facing surfaces collapse out_of_zone onto agreed's own phrase
  // -- to a buyer both just mean "settle it with the store directly". Only
  // STORE-facing surfaces (the admin order detail, the export) keep them
  // apart; see tests/shipping/status-label.test.ts for that distinction.
  it("out_of_zone: collapses onto the SAME buyer-facing copy as agreed's", async () => {
    getCheckoutShippingQuoteMock.mockResolvedValueOnce(resolvedQuote("out_of_zone", 0))

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    expect(await screen.findByText(buyerShippingLabels.agreed)).toBeInTheDocument()
    expect(screen.queryByText(t.totalPendingShipping)).not.toBeInTheDocument()
  })
})

describe("Checkout quote: a blocked or failed quote is visible and honest (D7)", () => {
  it("blocked: shows a dash instead of a price, the sentence as a destructive block below the totals, no total, and disables the submit button", async () => {
    getCheckoutShippingQuoteMock.mockResolvedValueOnce({ ok: false, blocked: true, message: "unused" })

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    const message = await screen.findByText(t.shippingBlocked)
    expect(message).toHaveClass("text-destructive")
    expect(screen.getByText(t.totalPendingShipping)).toBeInTheDocument()

    const shippingRow = screen.getByText(translations.es.cart.shipping).closest("div") as HTMLElement
    expect(within(shippingRow).getByText("—")).toBeInTheDocument()

    expect(screen.getByRole("button", { name: "Realizar pedido" })).toBeDisabled()
  })

  it("failed: a technical failure never shows a stale or wrong number, shows a dash, and offers a retry", async () => {
    getCheckoutShippingQuoteMock.mockRejectedValueOnce(new Error("network blip"))

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    const message = await screen.findByText(t.shippingQuoteFailed)
    expect(message).not.toHaveClass("text-destructive")
    expect(screen.getByText(t.totalPendingShipping)).toBeInTheDocument()

    const shippingRow = screen.getByText(translations.es.cart.shipping).closest("div") as HTMLElement
    expect(within(shippingRow).getByText("—")).toBeInTheDocument()

    // The buyer can't obey "Intenta de nuevo" by re-picking the SAME
    // municipality (handleDestinationChange's identity check bails that out)
    // -- the retry link is the only way back in.
    expect(screen.getByRole("button", { name: "Realizar pedido" })).not.toBeDisabled()
  })

  it("failed: the retry button re-fires the quote for the same destination and recovers", async () => {
    getCheckoutShippingQuoteMock
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce(resolvedQuote("rate", 15000))

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")

    await screen.findByText(t.shippingQuoteFailed)
    expect(getCheckoutShippingQuoteMock).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole("button", { name: "Reintentar" }))

    await waitFor(() => expect(getCheckoutShippingQuoteMock).toHaveBeenCalledTimes(2))
    expect(await screen.findByText(price(15000))).toBeInTheDocument()
    expect(screen.queryByText(t.shippingQuoteFailed)).not.toBeInTheDocument()
  })
})

describe("Checkout quote: an in-flight request for an older destination never overwrites a newer one", () => {
  it("keeps the newer quote's amount even when the older request resolves later", async () => {
    const older = createDeferred<CheckoutShippingQuoteResult>()
    const newer = createDeferred<CheckoutShippingQuoteResult>()
    getCheckoutShippingQuoteMock.mockImplementationOnce(() => older.promise).mockImplementationOnce(() => newer.promise)

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")
    await waitFor(() => expect(getCheckoutShippingQuoteMock).toHaveBeenCalledTimes(1))

    await selectMunicipality("Envigado")
    await waitFor(() => expect(getCheckoutShippingQuoteMock).toHaveBeenCalledTimes(2))

    newer.resolve(resolvedQuote("rate", 25000))
    await waitFor(() => expect(screen.getByText(price(25000))).toBeInTheDocument())

    older.resolve(resolvedQuote("rate", 15000))
    await waitFor(() => expect(screen.getByText(price(25000))).toBeInTheDocument())
    expect(screen.queryByText(price(15000))).not.toBeInTheDocument()
  })
})

describe("Checkout quote: D25 -- changing the municipality after a payment attempt never reuses the idempotency key", () => {
  it("mints a new key when the destination changes after a failed submit, and keeps it stable on a same-content retry", async () => {
    getCheckoutShippingQuoteMock
      .mockResolvedValueOnce(resolvedQuote("rate", 15000))
      .mockResolvedValueOnce(resolvedQuote("rate", 25000))
    placeCheckoutOrderMock.mockResolvedValueOnce({ success: false, error: "Transient failure" })

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")
    await waitFor(() => expect(screen.getByText(price(15000))).toBeInTheDocument())

    fillRequiredContactAndAddressFields()
    fireEvent.click(screen.getByRole("button", { name: "Realizar pedido" }))

    await waitFor(() => expect(placeCheckoutOrderMock).toHaveBeenCalledTimes(1))
    const firstKey = placeCheckoutOrderMock.mock.calls[0][1]

    // D25's regression: editing the municipality after the failed attempt
    // must not dead-end on idempotency_conflict -- it can't, because the
    // retry below carries a DIFFERENT key from the one the failed attempt used.
    await selectMunicipality("Envigado")
    await waitFor(() => expect(screen.getByText(price(25000))).toBeInTheDocument())

    placeCheckoutOrderMock.mockResolvedValueOnce({ success: true, orderNumber: "ORD-1", orderId: "order-1" })
    fireEvent.click(screen.getByRole("button", { name: "Realizar pedido" }))

    await waitFor(() => expect(placeCheckoutOrderMock).toHaveBeenCalledTimes(2))
    const secondKey = placeCheckoutOrderMock.mock.calls[1][1]

    expect(secondKey).not.toBe(firstKey)
  })

  it("keeps the SAME key on a retry that changes nothing", async () => {
    getCheckoutShippingQuoteMock.mockResolvedValue(resolvedQuote("rate", 15000))
    placeCheckoutOrderMock.mockResolvedValueOnce({ success: false, error: "Transient failure" })

    renderCheckoutPage()
    await selectDepartment()
    await selectMunicipality("Medellín")
    await waitFor(() => expect(screen.getByText(price(15000))).toBeInTheDocument())

    fillRequiredContactAndAddressFields()
    fireEvent.click(screen.getByRole("button", { name: "Realizar pedido" }))
    await waitFor(() => expect(placeCheckoutOrderMock).toHaveBeenCalledTimes(1))
    const firstKey = placeCheckoutOrderMock.mock.calls[0][1]

    placeCheckoutOrderMock.mockResolvedValueOnce({ success: true, orderNumber: "ORD-1", orderId: "order-1" })
    fireEvent.click(screen.getByRole("button", { name: "Realizar pedido" }))
    await waitFor(() => expect(placeCheckoutOrderMock).toHaveBeenCalledTimes(2))
    const secondKey = placeCheckoutOrderMock.mock.calls[1][1]

    expect(secondKey).toBe(firstKey)
  })
})
