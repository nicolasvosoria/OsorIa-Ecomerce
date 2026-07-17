import { render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { TenantDetail, TenantSummary } from "@/lib/supabase/stores-admin-api"

const { authorizeSuperAdmin, getTenantById, getTenantDetail, listStoreOwners, notFound, redirect } =
  vi.hoisted(() => ({
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
  }))

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }))
vi.mock("@/lib/supabase/stores-admin-api", () => ({ getTenantById, getTenantDetail }))
vi.mock("@/lib/supabase/memberships-api", () => ({ listStoreOwners }))
vi.mock("next/navigation", () => ({
  notFound,
  redirect,
  usePathname: () => "/tenant-id",
  useRouter: () => ({ push: vi.fn() }),
}))

import TenantDetailPage from "@/app/(platform)/admin/stores/[id]/page"

const TENANT: TenantSummary = {
  id: "9b1b807c-de03-438f-a92a-349b9aa64c11",
  store_name: "Tienda Principal",
  subdomain: "default",
  is_active: true,
  is_public: true,
  created_at: "2025-12-30T13:12:46.123Z",
  currency_code: "COP",
}

const DETAIL: TenantDetail = {
  ordersByStatus: {
    pending: 12,
    confirmed: 0,
    processing: 0,
    shipped: 1,
    delivered: 1,
    returned: 0,
    cancelled: 0,
  },
  ordersByPaymentStatus: { pending: 14, paid: 0, failed: 0, refunded: 0, cancelled: 0 },
  revenue: 0,
  lastOrderAt: "2026-07-13T17:53:20.069Z",
  totalItemCount: 9,
  activeItemCount: 9,
  cartsByStatus: { active: 0, abandoned: 0, expired: 0 },
  memberCount: 1,
  themeName: "Bold",
  isThemeCustom: true,
  hasBranding: false,
}

function callPage(id: string) {
  return TenantDetailPage({ params: Promise.resolve({ id }) })
}

describe("TenantDetailPage (D6)", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" })
    getTenantById.mockResolvedValue(TENANT)
    getTenantDetail.mockResolvedValue(DETAIL)
    listStoreOwners.mockResolvedValue([
      {
        userId: "owner-1",
        email: "duena@correo.com",
        name: "Ana Pérez",
        role: "owner",
        isSupportAccess: false,
      },
    ])
  })

  it("redirects to the console when the caller isn't a super_admin", async () => {
    authorizeSuperAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 })

    await expect(callPage(TENANT.id)).rejects.toThrow("NEXT_REDIRECT")

    expect(redirect).toHaveBeenCalledWith("/admin/stores")
    expect(getTenantById).not.toHaveBeenCalled()
  })

  it("404s on an id that matches no store instead of rendering a blank health view", async () => {
    getTenantById.mockResolvedValue(null)

    await expect(callPage("missing-id")).rejects.toThrow("NEXT_NOT_FOUND")

    expect(notFound).toHaveBeenCalled()
    expect(getTenantDetail).not.toHaveBeenCalled()
  })

  it("renders the header facts and every aggregate section, PII-free", async () => {
    render(await callPage(TENANT.id))

    expect(screen.getByText("Tienda Principal")).toBeInTheDocument()
    expect(screen.getByText("default")).toBeInTheDocument()
    expect(screen.getByText("Activa")).toBeInTheDocument()
    expect(screen.getByText("Pública")).toBeInTheDocument()

    expect(screen.getByText("Pedidos por estado")).toBeInTheDocument()
    expect(screen.getByText("Pagos")).toBeInTheDocument()
    expect(screen.getByText("Catálogo")).toBeInTheDocument()
    expect(screen.getByText("Carritos")).toBeInTheDocument()
    expect(screen.getByText("Equipo")).toBeInTheDocument()
    expect(screen.getByText("Tema")).toBeInTheDocument()

    expect(screen.getByText("Bold")).toBeInTheDocument()
    expect(screen.getByText("Personalizado")).toBeInTheDocument()
    expect(screen.getByText("Sin marca")).toBeInTheDocument()
  })

  it("passes each section's own aggregate through to the rendered counts", async () => {
    render(await callPage(TENANT.id))

    expect(screen.getByText("activos de 9 productos")).toBeInTheDocument()

    const equipoCard = screen.getByText("Equipo").closest("div.rounded-md") as HTMLElement
    expect(within(equipoCard).getByText(String(DETAIL.memberCount))).toBeInTheDocument()
  })
})
