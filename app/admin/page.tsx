import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  Eye,
  Package,
  Palette,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";

import { DashboardCharts } from "./components/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPrice } from "@/lib/commerce/utils";
import { formatOrderDateTime } from "@/lib/orders/order-format";
import { ORDER_STATUS_LABELS } from "@/lib/orders/order-status";
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import {
  getStoreDashboardSummary,
  type RecentOrderSummary,
  type StoreDashboardSummary,
} from "@/lib/supabase/stats-api";

export default async function AdminDashboardPage() {
  const authorization = await authorizeActiveStoreAdmin();
  if ("error" in authorization) {
    redirect("/");
  }

  let summary: StoreDashboardSummary;
  try {
    summary = await getStoreDashboardSummary(authorization.storeId);
  } catch {
    return (
      <div className="space-y-6">
        <DashboardHeader />
        <DashboardErrorState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader />
      <KpiRow summary={summary} />
      <AlertsRow
        lowStockItems={summary.lowStockItems}
        pendingOrders={summary.pendingOrders}
      />
      <DashboardCharts
        salesByDay={summary.salesByDay}
        ordersByStatus={summary.ordersByStatus}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <RecentOrdersCard orders={summary.recentOrders} />
        <QuickActionsCard />
      </div>
    </div>
  );
}

function DashboardErrorState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div role="alert" className="space-y-1">
          <p className="text-sm font-medium text-destructive">
            No se pudieron cargar las métricas del panel
          </p>
          <p className="text-sm text-muted-foreground">
            Intenta recargar la página. Si el problema persiste, contacta a soporte.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground">Resumen</h1>
        <p className="text-sm text-muted-foreground">
          El estado de tu tienda de un vistazo
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button variant="outline" size="sm" className="gap-2" asChild>
          <Link href="/">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Ver tienda</span>
          </Link>
        </Button>
        <Button size="sm" className="gap-2" asChild>
          <Link href="/admin/stats">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Ver estadísticas</span>
          </Link>
        </Button>
      </div>
    </header>
  );
}

function KpiRow({ summary }: { summary: StoreDashboardSummary }) {
  const kpis = [
    {
      label: "Ventas del mes",
      value: formatPrice(summary.monthlySales),
      caption: "Pedidos pagados del mes en curso",
    },
    {
      label: "Pedidos hoy",
      value: String(summary.ordersToday),
      caption: "Recibidos desde medianoche",
    },
    {
      label: "Ticket promedio",
      value: formatPrice(summary.averageOrderValue),
      caption: "Por pedido pagado (30 días)",
    },
    {
      label: "Stock bajo",
      value: String(summary.lowStockItems),
      caption: "Productos en o bajo el mínimo",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium uppercase tracking-wide">
              {kpi.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-bold tabular-nums text-foreground">
              {kpi.value}
            </p>
            <p className="text-xs text-muted-foreground">{kpi.caption}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AlertsRow({
  lowStockItems,
  pendingOrders,
}: {
  lowStockItems: number;
  pendingOrders: number;
}) {
  const alerts = [
    {
      icon: AlertTriangle,
      href: "/admin/products",
      count: lowStockItems,
      message: `${lowStockItems} ${lowStockItems === 1 ? "producto necesita" : "productos necesitan"} reposición de stock`,
      action: "Revisar catálogo",
    },
    {
      icon: Clock,
      href: "/admin/orders",
      count: pendingOrders,
      message: `${pendingOrders} ${pendingOrders === 1 ? "pedido pendiente" : "pedidos pendientes"} de confirmar`,
      action: "Ver pedidos",
    },
  ].filter((alert) => alert.count > 0);

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {alerts.map((alert) => (
        <Link
          key={alert.href}
          href={alert.href}
          className="group flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 transition-colors hover:bg-muted"
        >
          <alert.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="min-w-0 flex-1 truncate text-sm text-foreground">
            {alert.message}
          </p>
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            {alert.action}
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>
      ))}
    </div>
  );
}

function RecentOrdersCard({ orders }: { orders: RecentOrderSummary[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Pedidos recientes</CardTitle>
          <CardDescription>Los últimos pedidos de tu tienda</CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="shrink-0 gap-1" asChild>
          <Link href="/admin/orders">
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Aún no hay pedidos
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="group flex items-center gap-3 py-3 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {order.customerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      #{order.orderNumber} · {formatOrderDateTime(order.createdAt)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {formatPrice(order.total)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const QUICK_ACTIONS = [
  { label: "Crear producto", href: "/admin/products/create", icon: Plus },
  { label: "Ver pedidos", href: "/admin/orders", icon: Receipt },
  { label: "Catálogo", href: "/admin/products", icon: Package },
  { label: "Editor de tema", href: "/admin/theme", icon: Palette },
  { label: "Combos", href: "/admin/products/combos", icon: ShoppingCart },
];

function QuickActionsCard() {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Accesos rápidos</CardTitle>
        <CardDescription>Las tareas más frecuentes</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {QUICK_ACTIONS.map((action) => (
          <Button
            key={action.href}
            variant="outline"
            className="justify-start gap-2"
            asChild
          >
            <Link href={action.href}>
              <action.icon className="h-4 w-4 shrink-0" />
              {action.label}
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
