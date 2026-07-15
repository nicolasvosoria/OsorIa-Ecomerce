import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

const routerRefresh = vi.hoisted(() => vi.fn())
const setActiveStore = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}))

vi.mock("@/app/admin/actions/active-store", () => ({
  setActiveStore,
}))

import { StoreSwitcher } from "@/components/admin/shell/store-switcher"

const STORE_A = { id: "store-a", store_name: "Tienda A", subdomain: "a" }
const STORE_B = { id: "store-b", store_name: "Tienda B", subdomain: "b" }

beforeEach(() => {
  vi.clearAllMocks()
  setActiveStore.mockResolvedValue({ success: true })
})

describe("StoreSwitcher with a single store", () => {
  it("shows the store name for a plain admin instead of rendering nothing", () => {
    render(<StoreSwitcher stores={[STORE_A]} activeStoreId={STORE_A.id} isSuperAdmin={false} />)

    expect(screen.getByText("Tienda A")).toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("still renders an interactive switcher for a super admin", () => {
    render(<StoreSwitcher stores={[STORE_A]} activeStoreId={STORE_A.id} isSuperAdmin={true} />)

    expect(screen.getByRole("button", { name: /Tienda A/ })).toBeInTheDocument()
  })
})

describe("StoreSwitcher with multiple stores", () => {
  it("marks the active store as selected in the dropdown", async () => {
    render(
      <StoreSwitcher stores={[STORE_A, STORE_B]} activeStoreId={STORE_A.id} isSuperAdmin={false} />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Tienda A/ }))

    expect(screen.getByRole("menuitemradio", { name: "Tienda A" })).toHaveAttribute(
      "aria-checked",
      "true",
    )
    expect(screen.getByRole("menuitemradio", { name: "Tienda B" })).toHaveAttribute(
      "aria-checked",
      "false",
    )
  })

  it("switches the active store on selection", async () => {
    render(
      <StoreSwitcher stores={[STORE_A, STORE_B]} activeStoreId={STORE_A.id} isSuperAdmin={false} />,
    )

    await userEvent.click(screen.getByRole("button", { name: /Tienda A/ }))
    await userEvent.click(screen.getByRole("menuitemradio", { name: "Tienda B" }))

    expect(setActiveStore).toHaveBeenCalledWith(STORE_B.id)
  })
})
