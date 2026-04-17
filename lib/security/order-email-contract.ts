import { z } from "zod";

const orderConfirmationSchema = z.object({
  orderId: z.string().uuid("orderId inválido"),
  orderNumber: z.string().trim().min(1, "orderNumber requerido"),
  customerEmail: z.string().trim().email("customerEmail inválido"),
  customerName: z.string().trim().min(1).max(120).optional(),
});

type OrderConfirmationPayload = z.infer<typeof orderConfirmationSchema>;

export function parseOrderConfirmationRequest(
  input: unknown,
):
  | { success: true; data: OrderConfirmationPayload }
  | { success: false; error: string } {
  const parsed = orderConfirmationSchema.safeParse(input);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
      .join("; ");

    return {
      success: false,
      error: detail || "Payload inválido",
    };
  }

  return {
    success: true,
    data: parsed.data,
  };
}
