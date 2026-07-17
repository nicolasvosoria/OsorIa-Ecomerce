"use client";

import Link from "next/link";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCheckoutLoginIntent } from "@/contexts/checkout-login-intent-context";
import { useLanguage } from "@/contexts/language-context";
import type { Language } from "@/lib/i18n/translations";
import { formatCartMoney, LANGUAGE_LOCALES } from "@/lib/cart/cart-summary";
import type { OrdersPageView, OrdersListItem } from "./load-orders-view";

interface OrdersPageClientProps {
  view: OrdersPageView;
}

export function OrdersPageClient({ view }: OrdersPageClientProps) {
  if (!view.authenticated) {
    return <OrdersGuestState />;
  }

  if (view.orders.length === 0) {
    return <OrdersEmptyState />;
  }

  return <OrdersListPage orders={view.orders} />;
}

// El guest jamás llega a esta pantalla vía una lectura de pedidos (D5): el
// único CTA disponible es el puente de login de checkout (slice 4), reusado
// tal cual para esta señal genérica de "inicia sesión".
function OrdersGuestState() {
  const { t } = useLanguage();
  const { requestLogin } = useCheckoutLoginIntent();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <Package className="h-16 w-16 md:h-24 md:w-24 text-muted-foreground" />
          <h1 className="text-2xl md:text-3xl font-bold">{t.orders.guestTitle}</h1>
          <p className="text-muted-foreground max-w-md">{t.orders.guestDescription}</p>
          <Button onClick={requestLogin}>{t.checkout.guestLoginCta}</Button>
        </div>
      </div>
    </div>
  );
}

function OrdersEmptyState() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
          <Package className="h-16 w-16 md:h-24 md:w-24 text-muted-foreground" />
          <h1 className="text-2xl md:text-3xl font-bold">{t.orders.noOrders}</h1>
          <p className="text-muted-foreground max-w-md">{t.orders.emptyDescription}</p>
          <Button asChild>
            <Link href="/shop">{t.wishlist.exploreProducts}</Link>
          </Button>
        </div>
      </div>
    </div>
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
            {t.orders.orderNumber}: {order.orderNumber}
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
        </div>
      </CardContent>
    </Card>
  );
}

function formatOrderDate(orderDate: string, language: Language): string {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(orderDate));
}
