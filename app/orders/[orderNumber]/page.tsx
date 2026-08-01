import { loadOrderDetailView } from "./load-order-detail-view";
import { OrderDetailClient } from "./order-detail-client";

interface OrderDetailPageProps {
  params: Promise<{ orderNumber: string }>;
}

// La URL lleva el número de pedido y no el UUID: es el identificador que el
// cliente ya ve en su confirmación y en su correo, así que un enlace de soporte
// o de email apunta a algo que la persona reconoce. Adivinarlo no abre nada: la
// lectura sigue exigiendo user_id y store_id.
export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { orderNumber } = await params;
  const view = await loadOrderDetailView(orderNumber);

  return <OrderDetailClient view={view} />;
}
