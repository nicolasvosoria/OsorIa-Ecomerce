"use client"

import type { FieldPathByValue, FieldValues, UseFormRegister } from "react-hook-form"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field-error"
import { useLanguage } from "@/contexts/language-context"
import { PAYMENT_METHODS } from "@/lib/checkout/payment-methods"

// Única sección de método de pago del checkout: la arman el invitado y el
// usuario autenticado a partir del mismo registry, así el día que se habilite
// un segundo método aparece en ambos formularios sin tocarlos.
export function PaymentMethodSection<TFieldValues extends FieldValues>({
  register,
  name,
  error,
}: {
  register: UseFormRegister<TFieldValues>
  name: FieldPathByValue<TFieldValues, string>
  error?: string
}) {
  const { t } = useLanguage()
  const enabledMethods = PAYMENT_METHODS.filter((method) => method.enabled)
  const errorId = error ? `${name}-error` : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.checkout.paymentMethod}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {enabledMethods.map((method) => (
          <label
            key={method.id}
            className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer has-[:checked]:border-primary"
          >
            <input
              type="radio"
              value={method.id}
              className="mt-1"
              aria-describedby={errorId}
              {...register(name)}
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">{method.label}</span>
              <span className="block text-xs text-muted-foreground">{method.description}</span>
            </span>
          </label>
        ))}
        <FieldError id={errorId} message={error} />
      </CardContent>
    </Card>
  )
}
