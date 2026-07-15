"use client";

import Link from "next/link";
import { Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable, type Column, type DataTableState } from "@/components/admin/data-table";
import type { OrderWithItems } from "@/lib/supabase/orders-api";
import { formatPrice } from "@/lib/commerce/utils";
import { formatOrderDateTime } from "@/lib/orders/order-format";
import { OrderStatusSelect } from "./order-status-select";
import { PaymentStatusBadge } from "./payment-status-badge";

type OrdersTableProps = {
  rows: OrderWithItems[];
  state: DataTableState;
  pagination: { page: number; pageSize: number; total: number };
};

export function OrdersTable({ rows, state, pagination }: OrdersTableProps) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      state={state}
      emptyMessage="Aún no hay pedidos en tu tienda"
      errorMessage="No se pudieron cargar los pedidos"
      pagination={pagination}
    />
  );
}

const columns: Column<OrderWithItems>[] = [
  {
    key: "order_number",
    header: "Número de Pedido",
    cell: (order) => (
      <div>
        <div className="font-medium">{order.order_number}</div>
        <div className="text-sm text-muted-foreground">
          {order.customer_type === "guest" ? "Invitado" : "Usuario"}
        </div>
      </div>
    ),
  },
  {
    key: "customer",
    header: "Cliente",
    cell: (order) => (
      <div>
        <div className="font-medium">
          {order.customer_first_name} {order.customer_last_name}
        </div>
        <div className="text-sm text-muted-foreground">{order.customer_email}</div>
      </div>
    ),
  },
  {
    key: "date",
    header: "Fecha",
    cell: (order) => (
      <span className="text-sm">
        {formatOrderDateTime(order.order_date || order.created_at)}
      </span>
    ),
  },
  {
    key: "total",
    header: "Total",
    cell: (order) => (
      <span className="font-medium">
        {formatPrice(order.total_amount, order.currency_code)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Estado",
    cell: (order) => <OrderStatusSelect orderId={order.id} status={order.status} />,
  },
  {
    key: "payment",
    header: "Pago",
    cell: (order) => <PaymentStatusBadge status={order.payment_status} />,
  },
  {
    key: "actions",
    header: <span className="sr-only">Acciones</span>,
    className: "text-right",
    cell: (order) => (
      <Button variant="ghost" size="sm" className="gap-1.5" asChild>
        <Link href={`/admin/orders/${order.id}`}>
          <Eye className="h-4 w-4 shrink-0" />
          <span>Ver</span>
        </Link>
      </Button>
    ),
  },
];
