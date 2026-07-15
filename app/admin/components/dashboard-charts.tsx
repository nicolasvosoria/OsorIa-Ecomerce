"use client"

import { PieChart as PieChartIcon, TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { orderStatusChartColor } from "@/lib/charts/order-status-chart-color"
import { SALES_CHART_COLOR } from "@/lib/charts/sales-chart-color"
import { formatPrice } from "@/lib/commerce/utils"
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/orders/order-status"
import type { OrderStatusBreakdown, SalesByDay } from "@/lib/supabase/stats-api"

const SALES_GRADIENT_ID = "dashboard-sales-gradient"

export function DashboardCharts({
  salesByDay,
  ordersByStatus,
}: {
  salesByDay: SalesByDay[]
  ordersByStatus: OrderStatusBreakdown[]
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <SalesTrendCard salesByDay={salesByDay} />
      <OrderStatusCard ordersByStatus={ordersByStatus} />
    </div>
  )
}

function SalesTrendCard({ salesByDay }: { salesByDay: SalesByDay[] }) {
  const hasSales = salesByDay.some((day) => day.sales > 0)

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Ventas por día</CardTitle>
        </div>
        <CardDescription>Últimos 30 días</CardDescription>
      </CardHeader>
      <CardContent>
        {hasSales ? (
          <ChartContainer
            id="dashboard-sales"
            config={{ sales: { label: "Ventas", color: SALES_CHART_COLOR } }}
            className="h-56 w-full"
          >
            <AreaChart data={salesByDay}>
              <defs>
                <linearGradient id={SALES_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SALES_CHART_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SALES_CHART_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                minTickGap={24}
                tickFormatter={formatDayTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={formatCompactSales}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                labelFormatter={formatDayLabel}
                formatter={(value: number) => formatPrice(value)}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke={SALES_CHART_COLOR}
                fill={`url(#${SALES_GRADIENT_ID})`}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyChartMessage>Aún no hay ventas en este período</EmptyChartMessage>
        )}
      </CardContent>
    </Card>
  )
}

function OrderStatusCard({ ordersByStatus }: { ordersByStatus: OrderStatusBreakdown[] }) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Estados de pedido</CardTitle>
        </div>
        <CardDescription>Distribución de los últimos 30 días</CardDescription>
      </CardHeader>
      <CardContent>
        {ordersByStatus.length > 0 ? (
          <ChartContainer
            id="dashboard-order-status"
            config={toOrderStatusChartConfig(ordersByStatus)}
            className="h-56 w-full"
          >
            <PieChart>
              <Pie
                data={ordersByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={2}
              >
                {ordersByStatus.map((slice) => (
                  <Cell key={slice.status} fill={`var(--color-${slice.status})`} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        ) : (
          <EmptyChartMessage>Aún no hay pedidos en este período</EmptyChartMessage>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyChartMessage({ children }: { children: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
      {children}
    </div>
  )
}

function toOrderStatusChartConfig(ordersByStatus: OrderStatusBreakdown[]): ChartConfig {
  return Object.fromEntries(
    ordersByStatus.map((slice) => [
      slice.status,
      {
        label: ORDER_STATUS_LABELS[slice.status],
        color: orderStatusChartColor(ORDER_STATUSES.indexOf(slice.status)),
      },
    ])
  )
}

function formatDayTick(date: string): string {
  const [, month, day] = date.split("-")
  return `${Number(day)}/${Number(month)}`
}

function formatDayLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  })
}

function formatCompactSales(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}
