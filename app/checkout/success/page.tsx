import { CheckoutSuccessClient } from "./checkout-success-client";
import { loadSuccessPageFallbackOrder } from "./fallback-order";

interface CheckoutSuccessPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function CheckoutSuccessPage(
  props: CheckoutSuccessPageProps,
) {
  const resolvedSearchParams = await props.searchParams;
  const orderParam = resolvedSearchParams?.order;
  const orderNumber = Array.isArray(orderParam) ? orderParam[0] : orderParam;

  const fallback = await loadSuccessPageFallbackOrder(orderNumber);

  return (
    <CheckoutSuccessClient
      initialOrderNumber={fallback.orderNumber}
      initialCustomerData={fallback.customerData}
    />
  );
}
