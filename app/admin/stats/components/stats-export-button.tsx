"use client"

import * as XLSX from "xlsx"

import { ExcelExportButton } from "@/components/admin/excel-export-button"
import { formatPrice } from "@/lib/commerce/utils"
import { orderStatusLabel } from "@/lib/orders/order-status"
import type {
  DetailedStats,
  OrdersByStatus,
  SalesByDay,
  TopProduct,
} from "@/lib/supabase/stats-api"

const EXPORT_PERIOD_LABEL = "Últimos 30 días"

type ExportTotals = {
  sales: number
  paidOrders: number
  ordersRankedByCount: OrdersByStatus[]
  ordersCount: number
}

export function StatsExportButton({ stats }: { stats: DetailedStats }) {
  return (
    <ExcelExportButton
      fileNamePrefix="estadisticas"
      errorLogLabel="[Admin Stats]"
      buildWorkbook={() => buildWorkbook(stats)}
    />
  )
}

export function buildWorkbook(stats: DetailedStats): XLSX.WorkBook {
  const totals = summarizeForExport(stats)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, buildSummarySheet(stats, totals), "Resumen")
  XLSX.utils.book_append_sheet(
    workbook,
    buildSalesByDaySheet(stats.salesByDay, totals.sales),
    "Ventas por Día",
  )
  XLSX.utils.book_append_sheet(workbook, buildOrdersByStatusSheet(totals), "Pedidos por Estado")
  XLSX.utils.book_append_sheet(workbook, buildAdditionalStatsSheet(stats, totals), "Estadísticas")
  XLSX.utils.book_append_sheet(
    workbook,
    buildTopProductsSheet(stats.topProducts),
    "Productos Más Vendidos",
  )

  return workbook
}

function summarizeForExport(stats: DetailedStats): ExportTotals {
  return {
    sales: stats.salesByDay.reduce((sum, day) => sum + day.sales, 0),
    paidOrders: Math.round((stats.totalOrders * stats.conversionRate) / 100),
    ordersRankedByCount: [...stats.ordersByStatus].sort((a, b) => b.count - a.count),
    ordersCount: stats.ordersByStatus.reduce((sum, entry) => sum + entry.count, 0),
  }
}

function buildSummarySheet(stats: DetailedStats, totals: ExportTotals) {
  const generatedAt = new Date().toLocaleString("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const sheet = XLSX.utils.aoa_to_sheet([
    ["REPORTE DE ESTADÍSTICAS Y VENTAS"],
    [],
    ["Período:", EXPORT_PERIOD_LABEL],
    ["Fecha de generación:", generatedAt],
    [],
    ["INDICADORES PRINCIPALES"],
    ["Indicador", "Valor"],
    ["Total de pedidos", stats.totalOrders],
    ["Pedidos pagados", totals.paidOrders],
    ["Ventas totales (COP)", totals.sales],
    ["Valor promedio del pedido (COP)", Math.round(stats.averageOrderValue)],
    ["Tasa de conversión (%)", `${stats.conversionRate.toFixed(1)}%`],
  ])
  setColumnWidths(sheet, [35, 22])
  return sheet
}

function buildSalesByDaySheet(salesByDay: SalesByDay[], totalSales: number) {
  let runningSales = 0
  const rows = salesByDay.map((day) => {
    runningSales += day.sales
    const date = new Date(`${day.date}T00:00:00`)
    return {
      Fecha: date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      "Día semana": date.toLocaleDateString("es-ES", { weekday: "short" }),
      "Ventas (COP)": day.sales,
      Pedidos: day.orders,
      "Ventas acumuladas (COP)": runningSales,
      "% del total": percentageOfWithDecimalZero(day.sales, totalSales),
    }
  })

  const sheet = XLSX.utils.json_to_sheet(rows)
  setColumnWidths(sheet, [12, 12, 16, 10, 20, 12])
  return sheet
}

function buildOrdersByStatusSheet({ ordersRankedByCount, ordersCount }: ExportTotals) {
  const rows = ordersRankedByCount.map((entry) => ({
    Estado: orderStatusLabel(entry.status),
    Cantidad: entry.count,
    "% del total": percentageOf(entry.count, ordersCount),
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.sheet_add_aoa(sheet, [["TOTAL", ordersCount, "100"]], {
    origin: rows.length + 1,
  })
  setColumnWidths(sheet, [18, 12, 14])
  return sheet
}

function buildAdditionalStatsSheet(stats: DetailedStats, totals: ExportTotals) {
  const sheet = XLSX.utils.aoa_to_sheet([
    ["ESTADÍSTICAS ADICIONALES"],
    [],
    ["Métrica", "Valor"],
    ["Total de pedidos (período)", stats.totalOrders],
    ["Pedidos pagados", totals.paidOrders],
    ["Ventas totales (COP)", totals.sales],
    ["Valor promedio del pedido (COP)", formatPrice(stats.averageOrderValue)],
    ["Tasa de conversión (%)", stats.conversionRate.toFixed(2)],
    [],
    ["Resumen por estado"],
    ["Estado", "Cantidad", "%"],
    ...totals.ordersRankedByCount.map((entry) => [
      orderStatusLabel(entry.status),
      entry.count,
      `${percentageOf(entry.count, totals.ordersCount)}%`,
    ]),
  ])
  setColumnWidths(sheet, [38, 20])
  return sheet
}

function buildTopProductsSheet(topProducts: TopProduct[]) {
  const totalRevenue = topProducts.reduce((sum, product) => sum + product.revenue, 0)
  const totalQuantity = topProducts.reduce((sum, product) => sum + product.quantity, 0)
  const rows = topProducts.map((product, index) => ({
    "#": index + 1,
    Producto: product.name,
    "Cantidad vendida": product.quantity,
    "Ingresos (COP)": product.revenue,
    "Precio promedio (COP)":
      product.quantity > 0 ? Math.round(product.revenue / product.quantity) : 0,
    "% de ingresos": percentageOf(product.revenue, totalRevenue),
  }))

  const sheet = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.sheet_add_aoa(sheet, [["TOTAL", "", totalQuantity, totalRevenue, "", "100"]], {
    origin: rows.length + 1,
  })
  setColumnWidths(sheet, [4, 32, 16, 16, 18, 14])
  return sheet
}

function percentageOf(value: number, total: number): string {
  return total > 0 ? ((value / total) * 100).toFixed(1) : "0"
}

// "Ventas por Día" has always shown "% del total" with one decimal, even at 0%, unlike the
// other sheets' bare "0" — kept separate so this export column stays byte-stable.
function percentageOfWithDecimalZero(value: number, total: number): string {
  return total > 0 ? ((value / total) * 100).toFixed(1) : "0.0"
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((wch) => ({ wch }))
}
