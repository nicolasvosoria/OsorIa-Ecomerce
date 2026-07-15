import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it } from "vitest"

import { DashboardCharts } from "@/app/admin/components/dashboard-charts"
import type { OrderStatusBreakdown, SalesByDay } from "@/lib/supabase/stats-api"

// jsdom doesn't implement ResizeObserver; recharts' ResponsiveContainer needs it
// as soon as a chart (rather than an empty state) mounts.
beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  global.ResizeObserver = ResizeObserverStub
})

const SALES_BY_DAY: SalesByDay[] = [
  { date: "2026-04-25", sales: 0, orders: 0 },
  { date: "2026-04-26", sales: 100.5, orders: 1 },
]

const ORDERS_BY_STATUS: OrderStatusBreakdown[] = [
  { status: "pending", count: 1 },
  { status: "delivered", count: 2 },
]

describe("DashboardCharts", () => {
  it("renders a card per chart", () => {
    render(
      <DashboardCharts salesByDay={SALES_BY_DAY} ordersByStatus={ORDERS_BY_STATUS} />,
    )

    expect(screen.getByText("Ventas por día")).toBeInTheDocument()
    expect(screen.getByText("Estados de pedido")).toBeInTheDocument()
  })

  it("colors each order status slice from the shared chart palette", () => {
    const { container } = render(
      <DashboardCharts salesByDay={SALES_BY_DAY} ordersByStatus={ORDERS_BY_STATUS} />,
    )

    const chartStyles = Array.from(container.querySelectorAll("style"))
      .map((style) => style.innerHTML)
      .join("\n")

    expect(chartStyles).toContain("--color-pending: var(--chart-1)")
    expect(chartStyles).toContain("--color-delivered: var(--chart-5)")
  })

  it("explains the absence of data instead of rendering empty charts", () => {
    render(<DashboardCharts salesByDay={[]} ordersByStatus={[]} />)

    expect(screen.getByText("Aún no hay ventas en este período")).toBeInTheDocument()
    expect(screen.getByText("Aún no hay pedidos en este período")).toBeInTheDocument()
  })
})
