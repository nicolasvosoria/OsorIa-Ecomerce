import type { EmailTemplateInput, EmailTemplateKind, TenantEmailBranding } from "./types.ts";

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
    // D12: the confirmation receipt carries the resolved breakdown, unlike
    // every other order kind below -- see lib/email/types.ts's
    // OrderReceiptDetails.
    case "order-received": return {
      kind,
      branding: PREVIEW_BRANDING,
      data: {
        customerName: "Ana",
        orderNumber: "PREVIEW-1001",
        currencyCode: "COP",
        lines: [
          { productName: "Café en grano 500 g", quantity: 2, totalPrice: 100000 },
          { productName: "Filtro V60", variantTitle: "Talla única", quantity: 1, totalPrice: 20000 },
        ],
        subtotal: 120000,
        shippingCost: 0,
        shippingStatus: "free",
        totalAmount: 120000,
      },
    };
    case "merchant-new-order": return { kind, branding: PREVIEW_BRANDING, data: { orderNumber: "PREVIEW-1001", customerName: "Ana" } };
    case "membership-acceptance": return { kind, branding: PREVIEW_BRANDING, data: { recipientName: "Ana", membershipName: "administradora", actionPath: "/auth/accept-membership?token=preview" } };
    case "order-shipped": return { kind, branding: PREVIEW_BRANDING, data: { customerName: "Ana", orderNumber: "PREVIEW-1001", trackingCode: "PREVIEW-TRACK" } };
    case "order-returned": return { kind, branding: PREVIEW_BRANDING, data: { customerName: "Ana", orderNumber: "PREVIEW-1001", returnReason: "Solicitud de ejemplo" } };
    default: return { kind, branding: PREVIEW_BRANDING, data: { customerName: "Ana", orderNumber: "PREVIEW-1001" } };
  }
}
