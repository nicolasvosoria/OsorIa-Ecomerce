import type { EmailTemplateInput, EmailTemplateKind, TenantEmailBranding } from "./types";

const PREVIEW_BRANDING: TenantEmailBranding = {
  displayName: "Cumbre Dorada Café",
  validatedSubdomain: "cumbre-dorada",
  primaryColor: "#5daba8",
  commercialAddress: "Bogotá, Colombia",
  contactEmail: "hola@cumbredorada.example",
};

export function getEmailPreviewFixture(kind: EmailTemplateKind): EmailTemplateInput {
  switch (kind) {
    case "signup-confirmation": return { kind, branding: PREVIEW_BRANDING, data: { recipientName: "Ana", actionPath: "/signup/confirm?token=preview" } };
    case "owner-invite": return { kind, branding: PREVIEW_BRANDING, data: { recipientName: "Ana", actionPath: "/invites/preview" } };
    case "new-user-invite": return { kind, branding: PREVIEW_BRANDING, data: { recipientName: "Ana", actionPath: "/invites/preview" } };
    case "password-recovery": return { kind, branding: PREVIEW_BRANDING, data: { recipientName: "Ana", actionPath: "/password/reset?token=preview" } };
    case "password-changed": return { kind, branding: PREVIEW_BRANDING, data: { recipientName: "Ana" } };
    case "store-mailbox-verification": return { kind, branding: PREVIEW_BRANDING, data: { purpose: "order_mailbox", actionPath: "/auth/mailbox-verification?token=preview" } };
    case "merchant-new-order": return { kind, branding: PREVIEW_BRANDING, data: { orderNumber: "PREVIEW-1001", customerName: "Ana" } };
    case "membership-acceptance": return { kind, branding: PREVIEW_BRANDING, data: { recipientName: "Ana", membershipName: "administradora" } };
    case "order-shipped": return { kind, branding: PREVIEW_BRANDING, data: { customerName: "Ana", orderNumber: "PREVIEW-1001", trackingCode: "PREVIEW-TRACK" } };
    case "order-returned": return { kind, branding: PREVIEW_BRANDING, data: { customerName: "Ana", orderNumber: "PREVIEW-1001", returnReason: "Solicitud de ejemplo" } };
    default: return { kind, branding: PREVIEW_BRANDING, data: { customerName: "Ana", orderNumber: "PREVIEW-1001" } };
  }
}
