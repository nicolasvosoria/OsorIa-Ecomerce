import type { EmailTemplateKind } from "./types.ts";

export type EmailCopy = {
  subject: (storeName: string, reference?: string) => string;
  heading: string;
  actionLabel?: string;
};

export const EMAIL_COPY: Record<EmailTemplateKind, EmailCopy> = {
  "signup-confirmation": {
    subject: (storeName) => `Confirma tu registro en ${storeName}`,
    heading: "Confirma tu registro",
    actionLabel: "Confirmar registro",
  },
  "owner-invite": {
    subject: (storeName) => `Te invitaron a administrar ${storeName}`,
    heading: "Tu acceso de administración está listo",
    actionLabel: "Aceptar invitación",
  },
  "new-user-invite": {
    subject: (storeName) => `Te invitaron al equipo de ${storeName}`,
    heading: "Tienes una invitación al equipo",
    actionLabel: "Aceptar invitación",
  },
  "password-recovery": {
    subject: (storeName) => `Restablece tu contraseña de ${storeName}`,
    heading: "Restablece tu contraseña",
    actionLabel: "Restablecer contraseña",
  },
  "password-changed": {
    subject: (storeName) => `Tu contraseña de ${storeName} fue actualizada`,
    heading: "Tu contraseña fue actualizada",
  },
  "store-mailbox-verification": {
    subject: (storeName) => `Confirma un correo de ${storeName}`,
    heading: "Confirma este correo",
    actionLabel: "Confirmar correo",
  },
  "order-received": {
    subject: (storeName, orderNumber) => `Recibimos tu pedido ${orderNumber} en ${storeName}`,
    heading: "Recibimos tu pedido",
    actionLabel: "Ver pedido",
  },
  "merchant-new-order": {
    subject: (storeName, orderNumber) => `Nuevo pedido ${orderNumber} en ${storeName}`,
    heading: "Tienes un nuevo pedido",
    actionLabel: "Abrir pedido",
  },
  "membership-acceptance": {
    subject: (storeName) => `Tu acceso a ${storeName} fue activado`,
    heading: "Tu acceso fue activado",
    actionLabel: "Ir a administración",
  },
  "order-shipped": {
    subject: (storeName, orderNumber) => `Tu pedido ${orderNumber} fue enviado por ${storeName}`,
    heading: "Tu pedido fue enviado",
    actionLabel: "Ver pedido",
  },
  "order-delivered": {
    subject: (storeName, orderNumber) => `Tu pedido ${orderNumber} fue entregado`,
    heading: "Tu pedido fue entregado",
    actionLabel: "Ver pedido",
  },
  "order-cancelled": {
    subject: (storeName, orderNumber) => `Tu pedido ${orderNumber} fue cancelado`,
    heading: "Tu pedido fue cancelado",
    actionLabel: "Ver pedido",
  },
  "order-returned": {
    subject: (storeName, orderNumber) => `Actualización de la devolución ${orderNumber}`,
    heading: "Tu devolución fue registrada",
    actionLabel: "Ver pedido",
  },
};
