import { loadOrdersPageView } from "./load-orders-view";
import { OrdersPageClient } from "./orders-page-client";

export default async function OrdersPage() {
  const view = await loadOrdersPageView();

  return <OrdersPageClient view={view} />;
}
