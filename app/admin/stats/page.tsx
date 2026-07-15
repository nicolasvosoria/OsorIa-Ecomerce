import { redirect } from "next/navigation"
import { BarChart3, HelpCircle, Package } from "lucide-react"

import { AdminPageContainer } from "@/components/admin/page-container"
import { AdminPageHeader } from "@/components/admin/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { formatPrice } from "@/lib/commerce/utils"
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store"
import { getDetailedStats, type DetailedStats, type TopProduct } from "@/lib/supabase/stats-api"
import { StatsCharts } from "./components/stats-charts"
import { StatsExportButton } from "./components/stats-export-button"

export default async function AdminStatsPage() {
  const authorization = await authorizeActiveStoreAdmin()
  if ("error" in authorization) {
    redirect("/")
  }

  const stats = await getDetailedStats(authorization.storeId)

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Estadísticas y Reportes"
        subtitle="Análisis detallado de ventas, pedidos y productos"
        actions={<StatsExportButton stats={stats} />}
      />

      <StatsCharts salesByDay={stats.salesByDay} ordersByStatus={stats.ordersByStatus} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <AdditionalStatsCard stats={stats} />
        <TopProductsCard topProducts={stats.topProducts} />
      </div>
    </AdminPageContainer>
  )
}

function AdditionalStatsCard({ stats }: { stats: DetailedStats }) {
  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Estadísticas Adicionales</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Total de Pedidos</p>
          <p className="text-2xl font-bold">{stats.totalOrders}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Valor Promedio del Pedido</p>
          <p className="text-2xl font-bold">{formatPrice(stats.averageOrderValue)}</p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Tasa de Conversión</p>
            <ConversionRateHint />
          </div>
          <p className="text-2xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ConversionRateHint() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="Información sobre tasa de conversión"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="editor-chrome max-w-xs">
        <p className="mb-1 font-semibold">¿Qué es la Tasa de Conversión?</p>
        <p className="text-xs leading-relaxed">
          Porcentaje de pedidos que fueron pagados y confirmados exitosamente respecto al total
          de pedidos creados en el período seleccionado.
        </p>
        <p className="mt-2 border-t border-background/20 pt-2 text-xs">
          <strong>Fórmula:</strong> (Pedidos Pagados / Total de Pedidos) × 100
        </p>
      </TooltipContent>
    </Tooltip>
  )
}

function TopProductsCard({ topProducts }: { topProducts: TopProduct[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Productos Más Vendidos</CardTitle>
        </div>
        <CardDescription>Top 10 productos por ingresos (últimos 30 días)</CardDescription>
      </CardHeader>
      <CardContent>
        {topProducts.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            No hay datos disponibles
          </div>
        ) : (
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
                {topProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell className="text-right">{formatPrice(product.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
