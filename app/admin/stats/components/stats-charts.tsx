"use client"

import { PieChart as PieChartIcon, TrendingUp } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { orderStatusChartColor } from "@/lib/charts/order-status-chart-color"
import { SALES_CHART_COLOR } from "@/lib/charts/sales-chart-color"
import { formatPrice } from "@/lib/commerce/utils"
import { ORDER_STATUSES, orderStatusLabel } from "@/lib/orders/order-status"
import type { OrdersByStatus, SalesByDay } from "@/lib/supabase/stats-api"

const SALES_GRADIENT_ID = "stats-sales-gradient"
const UNKNOWN_ORDER_STATUS_CHART_COLOR = "var(--muted-foreground)"

export function StatsCharts({
  salesByDay,
  ordersByStatus,
}: {
  salesByDay: SalesByDay[]
  ordersByStatus: OrdersByStatus[]
}) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <SalesTrendCard salesByDay={salesByDay} />
      <OrderStatusCard ordersByStatus={ordersByStatus} />
    </div>
  )
}

function SalesTrendCard({ salesByDay }: { salesByDay: SalesByDay[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Ventas por Día (Últimos 30 días)</CardTitle>
        </div>
        <CardDescription>Evolución de ventas diarias</CardDescription>
      </CardHeader>
      <CardContent>
        {salesByDay.length > 0 ? (
          <ChartContainer
            id="sales-chart"
            config={{ sales: { label: "Ventas", color: SALES_CHART_COLOR } }}
            className="h-64"
          >
            <AreaChart data={salesByDay}>
              <defs>
                <linearGradient id={SALES_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SALES_CHART_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SALES_CHART_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tickFormatter={formatDayTick} />
              <YAxis tickFormatter={formatCompactSales} />
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
                dot={{ r: 3, fill: SALES_CHART_COLOR, strokeWidth: 1, stroke: "var(--card)" }}
                activeDot={{ r: 5, fill: SALES_CHART_COLOR, strokeWidth: 2, stroke: "var(--card)" }}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <EmptyChartMessage />
        )}
      </CardContent>
    </Card>
  )
}

function OrderStatusCard({ ordersByStatus }: { ordersByStatus: OrdersByStatus[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Pedidos por Estado</CardTitle>
        </div>
        <CardDescription>Distribución de pedidos según estado</CardDescription>
      </CardHeader>
      <CardContent>
        {ordersByStatus.length > 0 ? (
          <ChartContainer
            id="orders-status-chart"
            config={toOrderStatusChartConfig(ordersByStatus)}
            className="h-64"
          >
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={ordersByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(slice) => `${orderStatusLabel(slice.status)}: ${slice.count}`}
                >
                  {ordersByStatus.map((slice) => (
                    <Cell key={slice.status} fill={statusChartColor(slice.status)} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        ) : (
          <EmptyChartMessage />
        )}
      </CardContent>
    </Card>
  )
}

function EmptyChartMessage() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      No hay datos disponibles
    </div>
  )
}

function toOrderStatusChartConfig(ordersByStatus: OrdersByStatus[]): ChartConfig {
  return Object.fromEntries(
    ordersByStatus.map((slice) => [
      slice.status,
      { label: orderStatusLabel(slice.status), color: statusChartColor(slice.status) },
    ])
  )
}

function statusChartColor(status: string): string {
  const index = ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number])
  return index === -1 ? UNKNOWN_ORDER_STATUS_CHART_COLOR : orderStatusChartColor(index)
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
