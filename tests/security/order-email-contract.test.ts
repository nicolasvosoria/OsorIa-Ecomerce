import { describe, expect, it } from "vitest";

import { parseOrderConfirmationRequest } from "@/lib/security/order-email-contract";

describe("parseOrderConfirmationRequest", () => {
  it("accepts a valid payload", () => {
    const result = parseOrderConfirmationRequest({
      orderId: "84f0a892-cf12-4826-befd-cf64e1235123",
      orderNumber: "A-1001",
      customerEmail: "buyer@example.com",
      customerName: "Ada Lovelace",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customerEmail).toBe("buyer@example.com");
    }
  });

  it("rejects invalid customerEmail", () => {
    const result = parseOrderConfirmationRequest({
      orderId: "84f0a892-cf12-4826-befd-cf64e1235123",
      orderNumber: "A-1001",
      customerEmail: "invalid-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("customerEmail");
    }
  });
});
