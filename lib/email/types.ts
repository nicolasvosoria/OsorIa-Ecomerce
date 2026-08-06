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
  | EmailEnvelope<"order-received", OrderEmailInput>
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
