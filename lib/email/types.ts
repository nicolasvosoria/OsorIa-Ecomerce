import type { ShippingResolutionStatus } from "@/lib/shipping/resolver";

export const EMAIL_TEMPLATE_KINDS = [
  "signup-confirmation",
  "owner-invite",
  "new-user-invite",
  "password-recovery",
  "password-changed",
  "store-mailbox-verification",
  "order-received",
  "merchant-new-order",
  "membership-acceptance",
  "order-shipped",
  "order-delivered",
  "order-cancelled",
  "order-returned",
] as const;

export type EmailTemplateKind = (typeof EMAIL_TEMPLATE_KINDS)[number];

export type TenantEmailBranding = {
  displayName: string;
  validatedSubdomain: string;
  primaryColor: string;
  commercialAddress: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
};

type AuthEmailInput = {
  recipientName: string;
  actionPath: string;
};

type OrderEmailInput = {
  customerName: string;
  orderNumber: string;
};

type MerchantOrderEmailInput = {
  orderNumber: string;
  customerName: string;
};

// D21: membership is never granted immediately, so this is an invitation to
// accept, not a notice of something already active -- actionPath carries the
// hashed acceptance token the same way owner-invite/new-user-invite carry
// theirs, just through this app's own token (lib/security/verification-token.ts)
// instead of GoTrue's.
type MembershipEmailInput = {
  recipientName: string;
  membershipName: string;
  actionPath: string;
};

// No recipientName: whoever can read the mailbox may not be a named person
// (a shared pedidos@ inbox, for instance), so the copy addresses the mailbox's
// purpose instead of a person (D6).
type MailboxVerificationEmailInput = {
  purpose: "reply_to" | "order_mailbox";
  actionPath: string;
};

type OrderStatusEmailInput = OrderEmailInput & {
  trackingCode?: string;
  returnReason?: string;
};

// D12: one line per order item on the confirmation receipt -- product name
// (+ variant, when the item carries one), quantity and the line's own
// resolved total. lib/checkout/order-writer.ts reads this straight off the
// same order items the RPC is about to persist, nothing recomputed here.
export type OrderReceiptLine = {
  productName: string;
  variantTitle?: string;
  quantity: number;
  totalPrice: number;
};

// D12/D26: the resolved breakdown the confirmation email renders. Threaded
// through from what lib/checkout/order-writer.ts already resolved before
// the order write (S9's shipping resolution, the same subtotal/total the
// DB's own total_amount = subtotal + shipping_cost + tax_amount -
// discount_amount check will see) -- never recomputed here, or the receipt
// risks disagreeing with the order it describes.
export type OrderReceiptDetails = {
  currencyCode: string;
  lines: OrderReceiptLine[];
  subtotal: number;
  shippingCost: number;
  shippingStatus: ShippingResolutionStatus | null;
  totalAmount: number;
};

type OrderReceiptEmailInput = OrderEmailInput & OrderReceiptDetails;

type EmailEnvelope<K extends EmailTemplateKind, D> = {
  kind: K;
  branding: TenantEmailBranding;
  data: D;
};

export type EmailTemplateInput =
  | EmailEnvelope<"signup-confirmation", AuthEmailInput>
  | EmailEnvelope<"owner-invite", AuthEmailInput>
  | EmailEnvelope<"new-user-invite", AuthEmailInput>
  | EmailEnvelope<"password-recovery", AuthEmailInput>
  | EmailEnvelope<"password-changed", { recipientName: string }>
  | EmailEnvelope<"store-mailbox-verification", MailboxVerificationEmailInput>
  | EmailEnvelope<"order-received", OrderReceiptEmailInput>
  | EmailEnvelope<"merchant-new-order", MerchantOrderEmailInput>
  | EmailEnvelope<"membership-acceptance", MembershipEmailInput>
  | EmailEnvelope<"order-shipped", OrderStatusEmailInput>
  | EmailEnvelope<"order-delivered", OrderStatusEmailInput>
  | EmailEnvelope<"order-cancelled", OrderStatusEmailInput>
  | EmailEnvelope<"order-returned", OrderStatusEmailInput>;

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};
