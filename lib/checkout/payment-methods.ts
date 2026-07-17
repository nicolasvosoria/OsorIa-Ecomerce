export interface PaymentMethod {
  id: string
  label: string
  description: string
  enabled: boolean
}

// Única fuente de métodos de pago del checkout: la whitelist del servidor se
// deriva de esta lista. Habilitar un método nuevo = agregar una entrada aquí.
export const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cash_on_delivery",
    label: "Pago contra entrega",
    description: "Paga en efectivo cuando recibas tu pedido",
    enabled: true,
  },
]

export function enabledPaymentMethodIds(): string[] {
  return PAYMENT_METHODS.filter((method) => method.enabled).map((method) => method.id)
}

export function normalizePaymentMethod(paymentMethod: unknown): string {
  const enabledIds = enabledPaymentMethodIds()
  return typeof paymentMethod === "string" && enabledIds.includes(paymentMethod)
    ? paymentMethod
    : enabledIds[0]
}
