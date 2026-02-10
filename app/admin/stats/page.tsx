"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Loader2, 
  ShieldAlert, 
  TrendingUp,
  BarChart3,
  PieChart,
  Package,
  ArrowLeft,
  HelpCircle,
  Download,
} from "lucide-react"
import Link from "next/link"
import { getDetailedStats, type DetailedStats } from "@/lib/supabase/stats-api"
import { formatPrice } from "@/lib/shopify/utils"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import * as XLSX from "xlsx"

const STATUS_LABELS_ES: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  processing: "Procesando",
  shipped: "Enviado",
  delivered: "Entregado",
  returned: "Devuelto",
  cancelled: "Cancelado",
  unknown: "Desconocido",
}

function statusToSpanish(status: string): string {
  return STATUS_LABELS_ES[status] ?? status.charAt(0).toUpperCase() + status.slice(1)
}

export default function AdminStatsPage() {
  const { isAdmin, loading, hasChecked } = useAdminPermissions()
  const router = useRouter()
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [loadingDetailed, setLoadingDetailed] = useState(true)
  const [downloadingExcel, setDownloadingExcel] = useState(false)

  const downloadExcel = () => {
    if (!detailedStats) return

    setDownloadingExcel(true)
    try {
      const workbook = XLSX.utils.book_new()
      const totalSales = detailedStats.salesByDay.reduce((sum, d) => sum + (Number(d.sales) || 0), 0)
      const paidOrders = Math.round((detailedStats.totalOrders * detailedStats.conversionRate) / 100)
      const fechaGen = new Date().toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })
      const setColWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
        ws["!cols"] = widths.map((w) => ({ wch: w }))
      }

      // —— Hoja 1: Resumen ——
      const resumenRows = [
        ["REPORTE DE ESTADÍSTICAS Y VENTAS"],
        [],
        ["Período:", "Últimos 30 días"],
        ["Fecha de generación:", fechaGen],
        [],
        ["INDICADORES PRINCIPALES"],
        ["Indicador", "Valor"],
        ["Total de pedidos", detailedStats.totalOrders],
        ["Pedidos pagados", paidOrders],
        ["Ventas totales (COP)", totalSales],
        ["Valor promedio del pedido (COP)", Math.round(detailedStats.averageOrderValue)],
        ["Tasa de conversión (%)", `${detailedStats.conversionRate.toFixed(1)}%`],
      ]
      const resumenSheet = XLSX.utils.aoa_to_sheet(resumenRows)
      setColWidths(resumenSheet, [35, 22])
      XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen")

      // —— Hoja 2: Ventas por Día ——
      let acum = 0
      const salesData = detailedStats.salesByDay.map((item) => {
        acum += Number(item.sales) || 0
        const date = new Date(item.date + "T00:00:00")
        const pct = totalSales > 0 ? ((Number(item.sales) || 0) / totalSales) * 100 : 0
        return {
          Fecha: date.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }),
          "Día semana": date.toLocaleDateString("es-ES", { weekday: "short" }),
          "Ventas (COP)": Number(item.sales) || 0,
          Pedidos: Number(item.orders) || 0,
          "Ventas acumuladas (COP)": acum,
          "% del total": pct.toFixed(1),
        }
      })
      const salesSheet = XLSX.utils.json_to_sheet(salesData)
      setColWidths(salesSheet, [12, 12, 16, 10, 20, 12])
      XLSX.utils.book_append_sheet(workbook, salesSheet, "Ventas por Día")

      // —— Hoja 3: Pedidos por Estado ——
      const totalCount = detailedStats.ordersByStatus.reduce((s, i) => s + i.count, 0)
      const ordersSorted = [...detailedStats.ordersByStatus].sort((a, b) => b.count - a.count)
      const ordersData = ordersSorted.map((item) => ({
        Estado: statusToSpanish(item.status),
        Cantidad: item.count,
        "% del total": totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) : "0",
      }))
      const ordersSheet = XLSX.utils.json_to_sheet(ordersData)
      XLSX.utils.sheet_add_aoa(ordersSheet, [["TOTAL", totalCount, "100"]], { origin: ordersData.length + 1 })
      setColWidths(ordersSheet, [18, 12, 14])
      XLSX.utils.book_append_sheet(workbook, ordersSheet, "Pedidos por Estado")

      // —— Hoja 4: Estadísticas detalladas ——
      const statsRows = [
        ["ESTADÍSTICAS ADICIONALES"],
        [],
        ["Métrica", "Valor"],
        ["Total de pedidos (período)", detailedStats.totalOrders],
        ["Pedidos pagados", paidOrders],
        ["Ventas totales (COP)", totalSales],
        ["Valor promedio del pedido (COP)", formatPrice(detailedStats.averageOrderValue.toString(), "COP")],
        ["Tasa de conversión (%)", detailedStats.conversionRate.toFixed(2)],
        [],
        ["Resumen por estado"],
        ["Estado", "Cantidad", "%"],
        ...ordersSorted.map((item) => [
          statusToSpanish(item.status),
          item.count,
          totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) + "%" : "0%",
        ]),
      ]
      const statsSheet = XLSX.utils.aoa_to_sheet(statsRows)
      setColWidths(statsSheet, [38, 20])
      XLSX.utils.book_append_sheet(workbook, statsSheet, "Estadísticas")

      // —— Hoja 5: Productos más vendidos ——
      const totalRevenue = detailedStats.topProducts.reduce((s, p) => s + (Number(p.revenue) || 0), 0)
      const productsData = detailedStats.topProducts.map((item, idx) => {
        const rev = Number(item.revenue) || 0
        const qty = Number(item.quantity) || 0
        return {
          "#": idx + 1,
          Producto: item.name,
          "Cantidad vendida": qty,
          "Ingresos (COP)": rev,
          "Precio promedio (COP)": qty > 0 ? Math.round(rev / qty) : 0,
          "% de ingresos": totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(1) : "0",
        }
      })
      const productsSheet = XLSX.utils.json_to_sheet(productsData)
      const totalQty = detailedStats.topProducts.reduce((s, p) => s + (Number(p.quantity) || 0), 0)
      XLSX.utils.sheet_add_aoa(productsSheet, [["TOTAL", "", totalQty, totalRevenue, "", "100"]], { origin: productsData.length + 1 })
      setColWidths(productsSheet, [4, 32, 16, 16, 18, 14])
      XLSX.utils.book_append_sheet(workbook, productsSheet, "Productos Más Vendidos")

      const fileName = `estadisticas_${new Date().toISOString().split("T")[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (error) {
      console.error("Error al generar Excel:", error)
      alert("Error al generar el archivo Excel. Por favor, intenta nuevamente.")
    } finally {
      setDownloadingExcel(false)
    }
  }

  useEffect(() => {
    // Solo redirigir si la verificación se completó (hasChecked) y no es admin
    // Esto asegura que esperamos a que isAdmin se actualice antes de redirigir
    if (hasChecked && !loading && !isAdmin) {
      console.log("[Admin Stats] Usuario no es admin después de verificación, redirigiendo...")
      router.push("/")
    }
  }, [isAdmin, loading, hasChecked, router])

  useEffect(() => {
    const loadStats = async () => {
      if (!isAdmin) return
      
      setLoadingDetailed(true)
      try {
        const detailed = await getDetailedStats(30)
        setDetailedStats(detailed)
      } catch (error) {
        console.error("[Admin Stats] Error al cargar estadísticas:", error)
      } finally {
        setLoadingDetailed(false)
      }
    }

    if (isAdmin) {
      loadStats()
    }
  }, [isAdmin])

  // Mostrar loading mientras se verifican permisos
  if (loading || !hasChecked) {
    return (
      <div 
        className="flex flex-col items-center justify-center h-screen gap-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Loader2 
          className="h-8 w-8 animate-spin" 
          style={{ color: "var(--foreground)" }}
        />
        <p className="text-sm text-muted-foreground">
          Verificando permisos de administrador...
        </p>
      </div>
    )
  }

  // Solo mostrar acceso denegado si ya se verificaron los permisos y no es admin
  if (!isAdmin && hasChecked) {
    return (
      <div 
        className="flex items-center justify-center h-screen p-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Acceso Denegado</CardTitle>
            </div>
            <CardDescription>
              No tienes permisos para acceder a esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: "var(--background)",
        background: "linear-gradient(to bottom right, var(--background), var(--muted))"
      }}
    >
      {/* Header */}
      <header 
        className="border-b shadow-sm"
        style={{ 
          backgroundColor: "var(--card)",
          borderColor: "var(--border)"
        }}
      >
        <div className="container mx-auto px-4 py-4 max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 
                  className="text-lg sm:text-xl md:text-2xl font-bold truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  Estadísticas y Reportes
                </h1>
                <p 
                  className="text-xs sm:text-sm mt-1 truncate"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Análisis detallado de ventas, pedidos y productos
                </p>
              </div>
            </div>
            <Button 
              onClick={downloadExcel}
              disabled={!detailedStats || loadingDetailed || downloadingExcel}
              className="shrink-0"
            >
              {downloadingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-full overflow-x-hidden">
        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Ventas por Día */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                <CardTitle>Ventas por Día (Últimos 30 días)</CardTitle>
              </div>
              <CardDescription>Evolución de ventas diarias</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDetailed ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : detailedStats && detailedStats.salesByDay.length > 0 ? (
                <ChartContainer
                  id="sales-chart"
                  config={{
                    sales: {
                      label: "Ventas",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-64"
                >
                  <AreaChart data={detailedStats.salesByDay}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => {
                        const date = new Date(value + 'T00:00:00')
                        return `${date.getDate()}/${date.getMonth() + 1}`
                      }}
                    />
                    <YAxis 
                      tickFormatter={(value) => {
                        if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
                        if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
                        return `$${value}`
                      }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      labelFormatter={(value) => {
                        const date = new Date(value + 'T00:00:00')
                        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
                      }}
                      formatter={(value: number) => formatPrice(value.toString(), "COP")}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="hsl(var(--chart-1))" 
                      fill="url(#colorSales)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--chart-1))", strokeWidth: 1, stroke: "#fff" }}
                      activeDot={{ r: 5, fill: "hsl(var(--chart-1))", strokeWidth: 2, stroke: "#fff" }}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gráfico de Pedidos por Estado */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-green-500" />
                <CardTitle>Pedidos por Estado</CardTitle>
              </div>
              <CardDescription>Distribución de pedidos según estado</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDetailed ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : detailedStats && detailedStats.ordersByStatus.length > 0 ? (
                <ChartContainer
                  id="orders-status-chart"
                  config={detailedStats.ordersByStatus.reduce((acc, item, index) => {
                    const colors = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(280, 100%, 70%)']
                    acc[item.status] = {
                      label: statusToSpanish(item.status),
                      color: colors[index % colors.length],
                    }
                    return acc
                  }, {} as Record<string, { label: string; color: string }>)}
                  className="h-64"
                >
                  <ResponsiveContainer>
                    <RechartsPieChart>
                      <Pie
                        data={detailedStats.ordersByStatus}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => `${statusToSpanish(entry.status)}: ${entry.count}`}
                      >
                        {detailedStats.ordersByStatus.map((entry, index) => {
                          const colors = ['hsl(221, 83%, 53%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(262, 83%, 58%)', 'hsl(280, 100%, 70%)']
                          return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        })}
                      </Pie>
                      <ChartTooltip content={<ChartTooltipContent />} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Estadísticas Adicionales y Productos Más Vendidos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Estadísticas Adicionales */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-500" />
                <CardTitle>Estadísticas Adicionales</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDetailed ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : detailedStats ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                    <p className="text-2xl font-bold">{detailedStats.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Valor Promedio del Pedido</p>
                    <p className="text-2xl font-bold">
                      {formatPrice(detailedStats.averageOrderValue.toString(), "COP")}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                            aria-label="Información sobre tasa de conversión"
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="max-w-xs"
                        >
                          <p className="font-semibold mb-1">¿Qué es la Tasa de Conversión?</p>
                          <p className="text-xs leading-relaxed">
                            Porcentaje de pedidos que fueron pagados y confirmados exitosamente 
                            respecto al total de pedidos creados en el período seleccionado.
                          </p>
                          <p className="text-xs mt-2 pt-2 border-t border-background/20">
                            <strong>Fórmula:</strong> (Pedidos Pagados / Total de Pedidos) × 100
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-2xl font-bold">{detailedStats.conversionRate.toFixed(1)}%</p>
                  </div>
                </>
              ) : (
                <div className="text-muted-foreground">No hay datos disponibles</div>
              )}
            </CardContent>
          </Card>

          {/* Productos Más Vendidos */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-orange-500" />
                <CardTitle>Productos Más Vendidos</CardTitle>
              </div>
              <CardDescription>Top 10 productos por ingresos (últimos 30 días)</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDetailed ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : detailedStats && detailedStats.topProducts.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailedStats.topProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-right">{product.quantity}</TableCell>
                          <TableCell className="text-right">
                            {formatPrice(product.revenue.toString(), "COP")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

