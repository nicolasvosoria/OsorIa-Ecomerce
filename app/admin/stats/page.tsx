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
} from "lucide-react"
import Link from "next/link"
import { getDetailedStats, type DetailedStats } from "@/lib/supabase/stats-api"
import { formatPrice } from "@/lib/shopify/utils"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function AdminStatsPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [detailedStats, setDetailedStats] = useState<DetailedStats | null>(null)
  const [loadingDetailed, setLoadingDetailed] = useState(true)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Estadísticas y Reportes</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Análisis detallado de ventas, pedidos y productos
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
                  <LineChart data={detailedStats.salesByDay}>
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
                    <Line 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
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
                      label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
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
                        label={(entry) => `${entry.status}: ${entry.count}`}
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
                    <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
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

