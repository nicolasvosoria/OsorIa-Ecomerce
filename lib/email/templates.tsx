import type { CSSProperties } from "react";

import { Heading, Text } from "@react-email/components";

import { translations } from "@/lib/i18n/translations";
import { formatCommercePrice } from "@/lib/products/pricing";
import { shippingStatusLabelKeyForBuyer } from "@/lib/shipping/status-label";

import { EmailAction, EmailLayout } from "./components.tsx";
import { EMAIL_COPY } from "./copy.ts";
import { getAdminUrl, getTenantUrl } from "./urls.ts";
import type { EmailTemplateInput } from "./types.ts";

export function EmailTemplate({ input }: { input: EmailTemplateInput }) {
  const copy = EMAIL_COPY[input.kind];
  const text = getTemplateText(input);
  const action = getAction(input);

  return (
    <EmailLayout branding={input.branding}>
      <Heading as="h1" style={headingStyle}>{copy.heading}</Heading>
      <Text style={bodyTextStyle}>{text}</Text>
      {input.kind === "order-received" ? <OrderReceiptBreakdown data={input.data} /> : null}
      {action ? (
        <EmailAction href={action.href} label={copy.actionLabel ?? "Continuar"} primaryColor={input.branding.primaryColor} />
      ) : null}
    </EmailLayout>
  );
}

// D12: the buyer's only durable record of what they bought and what it
// cost -- item lines, subtotal, shipping and total, read straight off
// lib/email/types.ts's OrderReceiptDetails (never recomputed here). Plain
// <table>s marked data-text-format="dataTable" instead of a flex/grid
// layout: @react-email/render's own plainText conversion (lib/email/render.ts)
// already recognizes that attribute and renders it as aligned label/amount
// lines in the text body, so the HTML and text stay in lockstep from one
// markup instead of two hand-kept copies.
function OrderReceiptBreakdown({
  data,
}: {
  data: Extract<EmailTemplateInput, { kind: "order-received" }>["data"];
}) {
  const money = (amount: number) => formatCommercePrice(amount, data.currencyCode);
  // D23/A15: BUYER-facing -- shippingStatusLabelKeyForBuyer collapses
  // "agreed"/"out_of_zone" onto one phrase and keeps "free" apart; "rate"
  // and a legacy null status (an order predating shipping_status) render the
  // resolved amount instead of a phrase, so a legacy order never implies a
  // free or to-be-agreed shipment it didn't have. The phrase text itself
  // comes from lib/i18n/translations.ts, the same vocabulary the checkout
  // success page and the order detail screen read (D31) -- not retyped here,
  // so it can't drift into a second mapping (D23/A15).
  const shippingLabelKey = shippingStatusLabelKeyForBuyer(data.shippingStatus);
  const shippingDisplay = shippingLabelKey
    ? translations.es.orders.shippingStatusLabels.buyer[shippingLabelKey]
    : money(data.shippingCost);

  return (
    <>
      <table role="presentation" width="100%" align="center" border={0} cellPadding={0} cellSpacing={0} style={itemsTableStyle} data-text-format="dataTable">
        <tbody>
          {data.lines.map((line, index) => (
            <tr key={index}>
              <td style={itemLabelCellStyle}>
                {line.quantity} × {line.productName}
                {line.variantTitle ? ` (${line.variantTitle})` : ""}
              </td>
              <td style={itemAmountCellStyle}>{money(line.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table role="presentation" width="100%" align="center" border={0} cellPadding={0} cellSpacing={0} style={totalsTableStyle} data-text-format="dataTable">
        <tbody>
          <tr>
            <td style={totalsLabelCellStyle}>{translations.es.cart.subtotal}</td>
            <td style={totalsAmountCellStyle}>{money(data.subtotal)}</td>
          </tr>
          <tr>
            <td style={totalsLabelCellStyle}>{translations.es.cart.shipping}</td>
            <td style={totalsAmountCellStyle}>{shippingDisplay}</td>
          </tr>
          <tr>
            <td style={totalRowLabelCellStyle}>{translations.es.cart.total}</td>
            <td style={totalRowAmountCellStyle}>{money(data.totalAmount)}</td>
          </tr>
        </tbody>
      </table>
    </>
  );
}

function getTemplateText(input: EmailTemplateInput): string {
  switch (input.kind) {
    case "signup-confirmation": return `Hola, ${input.data.recipientName}. Confirma tu registro para continuar en ${input.branding.displayName}.`;
    case "owner-invite": return `Hola, ${input.data.recipientName}. Te invitaron a administrar ${input.branding.displayName}.`;
    case "new-user-invite": return `Hola, ${input.data.recipientName}. Te invitaron al equipo de ${input.branding.displayName}.`;
    case "password-recovery": return `Hola, ${input.data.recipientName}. Usa este enlace para restablecer tu contraseña.`;
    case "password-changed": return `Hola, ${input.data.recipientName}. Tu contraseña fue actualizada correctamente.`;
    case "store-mailbox-verification": return `Alguien solicitó usar este correo como ${input.data.purpose === "reply_to" ? "correo de respuesta" : "buzón de pedidos"} de ${input.branding.displayName}. Si fuiste tú, confirma con el siguiente enlace. Si no reconoces esta solicitud, ignora este mensaje.`;
    case "order-received": return `Hola, ${input.data.customerName}. Recibimos tu pedido ${input.data.orderNumber} y te avisaremos de sus novedades.`;
    case "merchant-new-order": return `El pedido ${input.data.orderNumber} de ${input.data.customerName} está listo para que lo revises.`;
    case "membership-acceptance": return `Hola, ${input.data.recipientName}. Te invitaron como ${input.data.membershipName} de ${input.branding.displayName}. Acepta para activar tu acceso.`;
    case "order-shipped": return `Hola, ${input.data.customerName}. Tu pedido ${input.data.orderNumber} fue enviado${input.data.trackingCode ? ` con guía ${input.data.trackingCode}` : ""}.`;
    case "order-delivered": return `Hola, ${input.data.customerName}. Tu pedido ${input.data.orderNumber} fue entregado.`;
    case "order-cancelled": return `Hola, ${input.data.customerName}. Tu pedido ${input.data.orderNumber} fue cancelado.`;
    case "order-returned": return `Hola, ${input.data.customerName}. Registramos la devolución de tu pedido ${input.data.orderNumber}${input.data.returnReason ? `: ${input.data.returnReason}` : ""}.`;
  }
}

function getAction(input: EmailTemplateInput): { href: string } | undefined {
  switch (input.kind) {
    // Customer-facing (D8): reached from a tenant storefront's own /auth
    // journey (header signup modal, password recovery dialog), never the
    // admin console, so the link returns to that SAME tenant subdomain.
    case "signup-confirmation":
    case "password-recovery": return { href: getTenantUrl(input.branding.validatedSubdomain, input.data.actionPath) };
    // Owner/admin-facing: these three are only ever reached from inside the
    // admin console (accepting an invite, confirming a mailbox from
    // /admin/settings), so the link lands there.
    case "owner-invite":
    case "new-user-invite":
    case "store-mailbox-verification":
    case "membership-acceptance": return { href: getAdminUrl(input.data.actionPath) };
    case "password-changed": return undefined;
    case "merchant-new-order": return { href: getAdminUrl(`/orders/${encodeURIComponent(input.data.orderNumber)}`) };
    default: return { href: getTenantUrl(input.branding.validatedSubdomain, `/orders/${encodeURIComponent(input.data.orderNumber)}`) };
  }
}

// headline (600, 24px, 1.2, -0.01em) — DESIGN.md typography ramp. Valores en
// px/em porque los clientes de correo no resuelven `rem`.
const headingStyle: CSSProperties = {
  fontSize: "24px",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  lineHeight: 1.2,
  margin: "0 0 16px",
};
// body (400, 16px, 1.5) — DESIGN.md typography ramp
const bodyTextStyle: CSSProperties = { fontSize: "16px", fontWeight: 400, lineHeight: 1.5, margin: "0 0 16px" };

// label (500, 14px, 1.25) — DESIGN.md typography ramp, same ramp
// components.tsx's footerTextStyle already uses.
const itemsTableStyle: CSSProperties = { borderCollapse: "collapse", margin: "0 0 12px", width: "100%" };
const itemLabelCellStyle: CSSProperties = {
  color: "#1a1a1a", // tinta
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.25,
  padding: "4px 0",
  textAlign: "left",
};
const itemAmountCellStyle: CSSProperties = { ...itemLabelCellStyle, textAlign: "right", whiteSpace: "nowrap" };

const totalsTableStyle: CSSProperties = { borderCollapse: "collapse", margin: "0 0 16px", width: "100%" };
const totalsLabelCellStyle: CSSProperties = {
  color: "#718096", // tinta-tenue
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.25,
  padding: "4px 0",
  textAlign: "left",
};
const totalsAmountCellStyle: CSSProperties = { ...totalsLabelCellStyle, color: "#1a1a1a", textAlign: "right" };
// title-adjacent emphasis for the total row -- filete (#e2e8f0, DESIGN.md)
// as the divider that separates it from subtotal/shipping above.
const totalRowLabelCellStyle: CSSProperties = {
  ...totalsLabelCellStyle,
  borderTop: "1px solid #e2e8f0",
  color: "#1a1a1a",
  fontSize: "16px",
  fontWeight: 600,
  paddingTop: "8px",
};
const totalRowAmountCellStyle: CSSProperties = { ...totalRowLabelCellStyle, textAlign: "right" };
