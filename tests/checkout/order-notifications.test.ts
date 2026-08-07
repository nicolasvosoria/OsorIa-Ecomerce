import { describe, expect, it } from "vitest";

import {
  buildOrderOutboxNotifications,
  type OrderNotificationContext,
} from "@/lib/checkout/order-notifications";
import type { OrderReceiptDetails } from "@/lib/email/types";
import { translations } from "@/lib/i18n/translations";
import { formatCommercePrice } from "@/lib/products/pricing";
import type { StoreIdentityView } from "@/lib/supabase/store-identity-api";

// D12: full identity so both the customer receipt and the merchant
// notification build without hitting resolveMerchantRecipient's
// no-recipient branch -- that path is covered elsewhere
// (tests/orders/order-flow.contract.test.ts), this file is only about the
// receipt's own rendered breakdown.
const IDENTITY: StoreIdentityView = {
  displayName: "Cumbre Dorada Café",
  legalName: "Cumbre Dorada SAS",
  phone: "3000000000",
  commercialAddress: "Bogotá, Colombia",
  replyToVerifiedAt: null,
  orderMailboxVerifiedAt: "2026-01-01T00:00:00.000Z",
  logoUrl: null,
  primaryColor: "#5daba8",
  subdomain: "cumbre-dorada",
  contactEmail: "hola@cumbredorada.example",
  replyToEmail: null,
  replyToPendingEmail: null,
  orderMailboxEmail: "pedidos@cumbredorada.example",
  orderMailboxPendingEmail: null,
};

function buildContext(receipt: OrderReceiptDetails): OrderNotificationContext {
  return {
    identity: IDENTITY,
    storeId: "store-1",
    checkoutIdempotencyKey: "idem-1",
    orderNumber: "PED-1001",
    customerName: "Ana Pérez",
    customerEmail: "ana@example.com",
    receipt,
  };
}

async function buildCustomerReceipt(receipt: OrderReceiptDetails) {
  const notifications = await buildOrderOutboxNotifications(buildContext(receipt));
  const customerReceipt = notifications.find((n) => n.templateKind === "order-received");
  if (!customerReceipt) throw new Error("expected a customer receipt notification");
  return customerReceipt;
}

const BASE_LINES: OrderReceiptDetails["lines"] = [
  { productName: "Café en grano 500 g", quantity: 2, totalPrice: 100000 },
  { productName: "Filtro V60", variantTitle: "Talla única", quantity: 1, totalPrice: 20000 },
];

describe("buildOrderOutboxNotifications: order-received breakdown (D12)", () => {
  it("renders item lines, subtotal, shipping and total in both HTML and text, with no '<' or leaked entity in the text body", async () => {
    const receipt: OrderReceiptDetails = {
      currencyCode: "COP",
      lines: BASE_LINES,
      subtotal: 120000,
      shippingCost: 15000,
      shippingStatus: "rate",
      totalAmount: 135000,
    };
    const notification = await buildCustomerReceipt(receipt);

    const subtotalMoney = formatCommercePrice(120000, "COP");
    const shippingMoney = formatCommercePrice(15000, "COP");
    const totalMoney = formatCommercePrice(135000, "COP");

    for (const body of [notification.htmlBody, notification.textBody]) {
      expect(body).toContain("Café en grano 500 g");
      expect(body).toContain("Filtro V60");
      expect(body).toContain("Talla única");
      expect(body).toContain(subtotalMoney);
      expect(body).toContain(shippingMoney);
      expect(body).toContain(totalMoney);
    }

    expect(notification.textBody).not.toContain("<");
    // D15: the money formatter's own non-breaking space (U+00A0) between the
    // symbol and the amount is fine in text -- an escaped-entity LEAK
    // ("&nbsp;"/"&amp;" typed out as text) is the defect to catch.
    expect(notification.textBody).not.toContain("&nbsp;");
    expect(notification.textBody).not.toContain("&amp;");
  });

  it("renders the free-shipping phrase, not the $0 amount, when shippingStatus is 'free'", async () => {
    const notification = await buildCustomerReceipt({
      currencyCode: "COP",
      lines: BASE_LINES,
      subtotal: 120000,
      shippingCost: 0,
      shippingStatus: "free",
      totalAmount: 120000,
    });

    const freeLabel = translations.es.orders.shippingStatusLabels.buyer.free;
    expect(notification.htmlBody).toContain(freeLabel);
    expect(notification.textBody).toContain(freeLabel);
  });

  it.each(["agreed", "out_of_zone"] as const)(
    "collapses shippingStatus '%s' onto the same buyer-facing coordination phrase (D23/A15)",
    async (shippingStatus) => {
      const notification = await buildCustomerReceipt({
        currencyCode: "COP",
        lines: BASE_LINES,
        subtotal: 120000,
        shippingCost: 0,
        shippingStatus,
        totalAmount: 120000,
      });

      const agreedLabel = translations.es.orders.shippingStatusLabels.buyer.agreed;
      expect(notification.htmlBody).toContain(agreedLabel);
      expect(notification.textBody).toContain(agreedLabel);
    },
  );

  it("renders the resolved shipping amount, not a phrase, for a legacy order with a null shipping status", async () => {
    const notification = await buildCustomerReceipt({
      currencyCode: "COP",
      lines: BASE_LINES,
      subtotal: 120000,
      shippingCost: 8000,
      shippingStatus: null,
      totalAmount: 128000,
    });

    const shippingMoney = formatCommercePrice(8000, "COP");
    const freeLabel = translations.es.orders.shippingStatusLabels.buyer.free;
    const agreedLabel = translations.es.orders.shippingStatusLabels.buyer.agreed;

    for (const body of [notification.htmlBody, notification.textBody]) {
      expect(body).toContain(shippingMoney);
      expect(body).not.toContain(freeLabel);
      expect(body).not.toContain(agreedLabel);
    }
  });
});
