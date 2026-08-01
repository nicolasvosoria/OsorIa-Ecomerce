"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { formatCartMoney } from "@/lib/cart/cart-summary";
import { formatOrderDate } from "@/lib/orders/format-order-date";
import type { OrdersPageView, OrdersListItem } from "./load-orders-view";
import {
  OrderPageNotice,
  SignInToSeeOrdersNotice,
  StoreUnresolvedOrdersNotice,
} from "./order-page-notice";

interface OrdersPageClientProps {
  view: OrdersPageView;
}

export function OrdersPageClient({ view }: OrdersPageClientProps) {
  if (view.status === "guest") {
    return <SignInToSeeOrdersNotice />;
  }

  if (view.status === "storeUnresolved") {
    return <StoreUnresolvedOrdersNotice />;
  }

  if (view.orders.length === 0) {
    return <OrdersEmptyState />;
  }

  return <OrdersListPage orders={view.orders} />;
}

// Un cliente sin pedidos en ESTA tienda es lo normal, no un error: tras el
// recorte por tienda (D17) es además el caso más común.
function OrdersEmptyState() {
  const { t } = useLanguage();

  return (
    <OrderPageNotice
      title={t.orders.noOrders}
      description={t.orders.emptyDescription}
      action={
        <Button asChild>
          <Link href="/shop">{t.wishlist.exploreProducts}</Link>
        </Button>
      }
    />
  );
}

function OrdersListPage({ orders }: { orders: OrdersListItem[] }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <h1 className="text-2xl md:text-3xl font-bold mb-8">{t.nav.orders}</h1>
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderRow key={order.orderNumber} order={order} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order }: { order: OrdersListItem }) {
  const { t, language } = useLanguage();

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">
            {t.orders.orderNumber}: <span className="font-mono">{order.orderNumber}</span>
          </p>
          <p className="text-sm text-muted-foreground">
            {formatOrderDate(order.orderDate, language)} ·{" "}
            {t.orders.itemsCount.replace("{count}", String(order.itemCount))}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{t.orders.statusLabels[order.status]}</Badge>
          <Badge variant="outline">
            {t.orders.paymentStatusColumn}: {t.orders.paymentStatus[order.paymentStatus]}
          </Badge>
          <span className="font-bold">
            {formatCartMoney(order.totalAmount, order.currencyCode, language)}
          </span>
          {/* Cada fila repite el mismo rótulo, así que el número entra en el
              nombre accesible: "Ver detalle" a secas no dice de cuál. */}
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/orders/${encodeURIComponent(order.orderNumber)}`}
              aria-label={`${t.orders.viewDetail} ${order.orderNumber}`}
            >
              {t.orders.viewDetail}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
