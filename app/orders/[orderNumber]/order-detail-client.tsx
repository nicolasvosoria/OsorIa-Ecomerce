"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import {
  OrderPageNotice,
  SignInToSeeOrdersNotice,
  StoreUnresolvedOrdersNotice,
} from "@/app/orders/order-page-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/language-context";
import { formatPrice } from "@/lib/commerce/utils";
import { PAYMENT_METHODS } from "@/lib/checkout/payment-methods";
import { formatOrderDate } from "@/lib/orders/format-order-date";
import { shippingStatusLabelKey } from "@/lib/shipping/status-label";
import type { OrderDetail, OrderDetailView } from "./load-order-detail-view";

const ORDERS_HISTORY_PATH = "/orders";

export function OrderDetailClient({ view }: { view: OrderDetailView }) {
  if (view.status === "guest") {
    return <SignInToSeeOrdersNotice />;
  }

  if (view.status === "storeUnresolved") {
    return <StoreUnresolvedOrdersNotice />;
  }

  if (view.status === "notFound") {
    return <OrderNotFoundState />;
  }

  return <OrderDetailPage order={view.order} />;
}

// Un pedido ajeno y un número inexistente salen por la misma puerta: la
// pantalla no confirma si el pedido existe, solo que no es de quien pregunta.
function OrderNotFoundState() {
  const { t } = useLanguage();

  return (
    <OrderPageNotice
      title={t.orders.notFoundTitle}
      description={t.orders.notFoundDescription}
      action={
        <Button asChild>
          <Link href={ORDERS_HISTORY_PATH}>{t.orders.backToHistory}</Link>
        </Button>
      }
    />
  );
}

function OrderDetailPage({ order }: { order: OrderDetail }) {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-16">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
          <Link href={ORDERS_HISTORY_PATH}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.orders.backToHistory}
          </Link>
        </Button>

        <OrderDetailHeading orderNumber={order.orderNumber} />

        <div className="mb-8 mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{formatOrderDate(order.orderDate, language)}</span>
          <Badge variant="secondary">{t.orders.statusLabels[order.status]}</Badge>
          <Badge variant="outline">
            {t.orders.paymentStatusColumn}: {t.orders.paymentStatus[order.paymentStatus]}
          </Badge>
        </div>

        <div className="space-y-6">
          <OrderLinesCard order={order} />
          <OrderShippingCard order={order} />
        </div>
      </div>
    </div>
  );
}

// El número de pedido es el identificador que el cliente reconoce del correo y
// de la confirmación, así que va en el titular y en mono, como el resto de
// identificadores del sistema.
function OrderDetailHeading({ orderNumber }: { orderNumber: string }) {
  const { t } = useLanguage();
  const [beforeNumber, afterNumber] = t.orders.detailTitle.split("{number}");

  return (
    <h1 className="text-2xl font-bold md:text-3xl">
      {beforeNumber}
      <span className="font-mono">{orderNumber}</span>
      {afterNumber}
    </h1>
  );
}

function OrderLinesCard({ order }: { order: OrderDetail }) {
  const { t } = useLanguage();
  const money = (amount: number) => formatPrice(amount, order.currencyCode);
  // D23: "rate" and a legacy null render the amount; "agreed" and
  // "out_of_zone" collapse onto the same phrase, "free" onto its own.
  const shippingLabelKey = shippingStatusLabelKey(order.shippingStatus);
  const shippingDisplay = shippingLabelKey
    ? t.orders.shippingStatusLabels[shippingLabelKey]
    : money(order.shippingCost);

  return (
    // `CardTitle` pinta un <div>: sin rol de encabezado, las dos secciones del
    // pedido no existen para quien navega por encabezados. La primitiva se
    // comparte con la consola, así que el nivel se declara aquí, bajo el <h1>
    // con el número de pedido.
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {t.orders.itemsTitle}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border">
          {order.lines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-baseline justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-medium">{line.productName}</p>
                {line.variantTitle && (
                  <p className="text-sm text-muted-foreground">{line.variantTitle}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {line.quantity} × {money(line.unitPrice)}
                </p>
              </div>
              <span className="font-medium">{money(line.totalPrice)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.cart.subtotal}</dt>
            <dd>{money(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t.cart.shipping}</dt>
            <dd>{shippingDisplay}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>{t.cart.total}</dt>
            <dd>{money(order.totalAmount)}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function OrderShippingCard({ order }: { order: OrderDetail }) {
  const { t } = useLanguage();
  const { address, city, postalCode, country, notes } = order.shipping;

  return (
    <Card>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {t.checkout.shippingInfo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-base">{address}</p>
        <p className="text-muted-foreground">
          {[city, postalCode, country].filter(Boolean).join(" · ")}
        </p>
        {notes && (
          <p className="text-muted-foreground">
            {t.checkout.notes}: {notes}
          </p>
        )}
        <p className="pt-2 text-muted-foreground">
          {t.checkout.paymentMethod}: {paymentMethodLabel(order.paymentMethod)}
        </p>
      </CardContent>
    </Card>
  );
}

function paymentMethodLabel(paymentMethod: string | null): string {
  if (!paymentMethod) {
    return "—";
  }
  return PAYMENT_METHODS.find((method) => method.id === paymentMethod)?.label ?? paymentMethod;
}
