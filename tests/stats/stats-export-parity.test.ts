import { describe, expect, it } from "vitest"
import * as XLSX from "xlsx"

import { buildWorkbook } from "@/app/admin/stats/components/stats-export-button"
import type { DetailedStats } from "@/lib/supabase/stats-api"

const ZERO_SALES_STATS: DetailedStats = {
  salesByDay: [{ date: "2026-04-01", sales: 0, orders: 0 }],
  ordersByStatus: [{ status: "pending", count: 0 }],
  topProducts: [{ id: "p1", name: "Producto", sales: 0, quantity: 0, revenue: 0 }],
  totalOrders: 0,
  averageOrderValue: 0,
  conversionRate: 0,
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string) {
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName])
}

describe("stats export zero-total percentage parity", () => {
  it("keeps 'Ventas por Día' at '0.0' when totalSales is 0, matching the pre-refactor export", () => {
    const workbook = buildWorkbook(ZERO_SALES_STATS)

    const [row] = sheetRows(workbook, "Ventas por Día")

    expect(row["% del total"]).toBe("0.0")
  })

  it("keeps 'Pedidos por Estado' at a bare '0' when the order count total is 0", () => {
    const workbook = buildWorkbook(ZERO_SALES_STATS)

    const [row] = sheetRows(workbook, "Pedidos por Estado")

    expect(row["% del total"]).toBe("0")
  })

  it("keeps 'Estadísticas' at a bare '0%' when the order count total is 0", () => {
    const workbook = buildWorkbook(ZERO_SALES_STATS)

    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets["Estadísticas"], {
      header: 1,
    })
    const statusRow = rows.find((row) => row[0] === "Pendiente")

    expect(statusRow?.[2]).toBe("0%")
  })

  it("keeps 'Productos Más Vendidos' at a bare '0' when total revenue is 0", () => {
    const workbook = buildWorkbook(ZERO_SALES_STATS)

    const [row] = sheetRows(workbook, "Productos Más Vendidos")

    expect(row["% de ingresos"]).toBe("0")
  })
})
