import type { CSSProperties } from "react";

import { Heading, Text } from "@react-email/components";

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
      {action ? (
        <EmailAction href={action.href} label={copy.actionLabel ?? "Continuar"} primaryColor={input.branding.primaryColor} />
      ) : null}
    </EmailLayout>
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
