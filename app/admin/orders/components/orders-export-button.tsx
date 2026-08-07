"use client";

import * as XLSX from "xlsx";

import { ExcelExportButton } from "@/components/admin/excel-export-button";
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers";
import type { OrderWithItems } from "@/lib/supabase/orders-api";
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/orders/order-status";
import { formatOrderDateTime } from "@/lib/orders/order-format";
import { shippingStatusLabelKey } from "@/lib/shipping/status-label";
import { translations } from "@/lib/i18n/translations";

const EXCEL_EXPORT_FETCH_LIMIT = 10000;

async function fetchAllOrders(): Promise<OrderWithItems[]> {
  const params = new URLSearchParams({
    limit: String(EXCEL_EXPORT_FETCH_LIMIT),
    order_by: "created_at",
    order_direction: "desc",
  });
  const response = await fetch(`/api/admin/orders?${params.toString()}`, {
    headers: await getAdminRequestHeaders(),
  });
  if (!response.ok) {
    throw new Error("No se pudieron cargar los pedidos");
  }
  const result = (await response.json()) as { orders: OrderWithItems[] };
  return result.orders;
}

// D23: a translated phrase in a numeric column is a landmine for anyone
// summing "Envío" in a spreadsheet, so the amount stays a plain number and
// this dedicated text column carries the status instead. "rate" and a
// legacy null (an order placed before shipping_status existed) leave this
// blank on purpose -- the "Envío" number already says everything there is
// to say about them; only "agreed"/"out_of_zone" and "free" need a phrase
// to keep a $0 from meaning two things.
function shippingStatusColumnValue(order: OrderWithItems): string {
  const key = shippingStatusLabelKey(order.shipping_status ?? null);
  return key ? translations.es.orders.shippingStatusLabels[key] : "";
}

function buildOrdersSheet(orders: OrderWithItems[]) {
  const rows = orders.map((order) => ({
    "Número de Pedido": order.order_number,
    Fecha: formatOrderDateTime(order.order_date || order.created_at),
    Cliente: `${order.customer_first_name} ${order.customer_last_name}`,
    Email: order.customer_email,
    Teléfono: order.customer_phone || "",
    "Tipo Cliente": order.customer_type === "guest" ? "Invitado" : "Usuario",
    Dirección: order.shipping_address,
    Ciudad: order.shipping_city,
    "Código Postal": order.shipping_postal_code,
    País: order.shipping_country,
    Estado: ORDER_STATUS_LABELS[order.status] || order.status,
    "Estado de Pago":
      PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status,
    "Método de Pago": order.payment_method || "",
    "Referencia de Pago": order.payment_reference || "",
    Subtotal: order.subtotal,
    Envío: order.shipping_cost,
    [translations.es.orders.shippingStatusColumnLabel]: shippingStatusColumnValue(order),
    Impuestos: order.tax_amount,
    Descuento: order.discount_amount,
    Total: order.total_amount,
    Moneda: order.currency_code,
    Notas: order.notes || "",
    "Fecha Confirmación": formatOrderDateTime(order.confirmed_at),
    "Fecha Envío": formatOrderDateTime(order.shipped_at),
    "Fecha Entrega": formatOrderDateTime(order.delivered_at),
    "Fecha Cancelación": formatOrderDateTime(order.cancelled_at),
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 25 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 40 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 8 },
    { wch: 30 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
  ];
  return worksheet;
}

function buildItemsSheet(orders: OrderWithItems[]) {
  const rows = orders.flatMap((order) => {
    if (!order.items || order.items.length === 0) {
      return [
        {
          "Número de Pedido": order.order_number,
          Producto: "Sin productos",
          SKU: "",
          Variante: "",
          Cantidad: 0,
          "Precio Unitario": 0,
          Total: 0,
          Moneda: order.currency_code,
        },
      ];
    }

    return order.items.map((item) => ({
      "Número de Pedido": order.order_number,
      Producto: item.product_name,
      SKU: item.product_sku || "",
      Variante: item.variant_title || "",
      Cantidad: item.quantity,
      "Precio Unitario": item.unit_price,
      Total: item.total_price,
      Moneda: item.currency_code,
    }));
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 8 },
  ];
  return worksheet;
}

async function buildOrdersWorkbook(): Promise<XLSX.WorkBook> {
  const orders = await fetchAllOrders();
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, buildOrdersSheet(orders), "Pedidos");
  XLSX.utils.book_append_sheet(workbook, buildItemsSheet(orders), "Items de Pedidos");

  return workbook;
}

export function OrdersExportButton() {
  return (
    <ExcelExportButton
      fileNamePrefix="pedidos"
      errorLogLabel="[Admin Orders]"
      buildWorkbook={buildOrdersWorkbook}
    />
  );
}
