import { notFound, redirect } from "next/navigation";

import { AdminPageContainer } from "@/components/admin/page-container";
import { AdminPageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authorizeActiveStoreAdmin } from "@/lib/supabase/active-store";
import { getOrderById, type OrderWithItems } from "@/lib/supabase/orders-api";
import { formatPrice } from "@/lib/commerce/utils";
import { formatOrderDateTime } from "@/lib/orders/order-format";
import { ORDER_STATUS_LABELS } from "@/lib/orders/order-status";
import { shippingStatusLabelKeyForStore } from "@/lib/shipping/status-label";
import { translations } from "@/lib/i18n/translations";
import { OrderStatusSelect } from "../components/order-status-select";
import { PaymentStatusBadge } from "../components/payment-status-badge";

type OrderDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrderDetailPage({ params }: OrderDetailPageProps) {
  const authorization = await authorizeActiveStoreAdmin();
  if ("error" in authorization) {
    redirect("/");
  }

  const { id } = await params;
  const order = await getOrderById(id, authorization.storeId, authorization.supabase);
  if (!order) {
    notFound();
  }

  const orderLabel = `Pedido ${order.order_number}`;

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title={orderLabel}
        subtitle={formatOrderDateTime(order.order_date || order.created_at)}
        entityLabel={orderLabel}
        actions={<OrderStatusSelect orderId={order.id} status={order.status} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Productos</CardTitle>
            <CardDescription>Artículos incluidos en el pedido</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product_name}</div>
                      {item.variant_title && (
                        <div className="text-sm text-muted-foreground">
                          {item.variant_title}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(item.unit_price, item.currency_code)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(item.total_price, item.currency_code)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <OrderTotals order={order} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="font-medium text-foreground">
                {order.customer_first_name} {order.customer_last_name}
              </div>
              <div className="text-muted-foreground">{order.customer_email}</div>
              {order.customer_phone && (
                <div className="text-muted-foreground">{order.customer_phone}</div>
              )}
              <div className="text-muted-foreground">
                {order.customer_type === "guest" ? "Invitado" : "Usuario registrado"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Envío</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <div>{order.shipping_address}</div>
              <div>
                {order.shipping_city}, {order.shipping_postal_code}
              </div>
              <div>{order.shipping_country}</div>
              {order.shipping_notes && (
                <div className="pt-2 text-foreground">{order.shipping_notes}</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <OrderTimeline order={order} />
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminPageContainer>
  );
}

function OrderTotals({ order }: { order: OrderWithItems }) {
  const money = (amount: number) => formatPrice(amount, order.currency_code);
  // A15: store-facing audience-scoped mapping -- lib/shipping/status-label.ts.
  const shippingLabelKey = shippingStatusLabelKeyForStore(order.shipping_status ?? null);
  const rows = [
    { label: "Subtotal", value: money(order.subtotal) },
    {
      label: "Envío",
      value: shippingLabelKey
        ? translations.es.orders.shippingStatusLabels.store[shippingLabelKey]
        : money(order.shipping_cost),
    },
    { label: "Impuestos", value: money(order.tax_amount) },
    { label: "Descuento", value: money(-order.discount_amount) },
  ];

  return (
    <div className="space-y-2 border-t border-border p-4 text-sm">
      {rows.map((row) => (
        <div key={row.label} className="flex justify-between text-muted-foreground">
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
      <div className="flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
        <span>Total</span>
        <span>{formatPrice(order.total_amount, order.currency_code)}</span>
      </div>
    </div>
  );
}

function OrderTimeline({ order }: { order: OrderWithItems }) {
  const events = [
    { label: "Estado actual", value: ORDER_STATUS_LABELS[order.status] },
    { label: "Confirmado", value: formatOrderDateTime(order.confirmed_at) },
    { label: "Enviado", value: formatOrderDateTime(order.shipped_at) },
    { label: "Entregado", value: formatOrderDateTime(order.delivered_at) },
    { label: "Cancelado", value: formatOrderDateTime(order.cancelled_at) },
  ].filter((event) => event.value);

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">Pago</span>
        <PaymentStatusBadge status={order.payment_status} />
      </div>
      {events.map((event) => (
        <div key={event.label} className="flex items-center justify-between">
          <span className="text-muted-foreground">{event.label}</span>
          <span className="text-foreground">{event.value}</span>
        </div>
      ))}
    </>
  );
}
