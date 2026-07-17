import { CheckoutSuccessClient } from "./checkout-success-client";
import { loadSuccessPageFallbackOrder } from "./fallback-order";
import { getStoreIdServer } from "@/lib/utils/store-server";

interface CheckoutSuccessPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CheckoutSuccessPage(
  props: CheckoutSuccessPageProps,
) {
  const resolvedSearchParams = await props.searchParams;
  const orderParam = resolvedSearchParams?.order;
  const orderNumber = Array.isArray(orderParam) ? orderParam[0] : orderParam;
  const emailParam = resolvedSearchParams?.email;
  const email = Array.isArray(emailParam) ? emailParam[0] : emailParam;

  const storeId = await getStoreIdServer();
  const guestAuth = storeId && email ? { storeId, email } : null;
  const fallback = await loadSuccessPageFallbackOrder(orderNumber, guestAuth);

  return (
    <CheckoutSuccessClient
      initialOrderNumber={fallback.orderNumber}
      initialCustomerData={fallback.customerData}
      initialOrderSummary={fallback.orderSummary}
    />
  );
}
