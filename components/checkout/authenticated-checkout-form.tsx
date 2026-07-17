"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { PaymentMethodSection } from "@/components/checkout/payment-method-section"
import { SubmitOrderButton } from "@/components/checkout/submit-order-button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { enabledPaymentMethodIds } from "@/lib/checkout/payment-methods"
import {
  authenticatedCheckoutFormSchema,
  type AuthenticatedCheckoutFormValues,
} from "@/lib/checkout/schemas"
import type { UserProfile } from "@/lib/types/user"
import type { CheckoutPrefill } from "@/app/checkout/actions"

interface AuthenticatedCheckoutFormProps {
  user: UserProfile
  onComplete: (data: {
    firstName: string
    lastName: string
    phone: string
    address: string
    paymentMethod: string
  }) => void
  isLoading?: boolean
  // Llega de forma asíncrona (D4): el formulario nunca espera por esto para
  // renderizarse, solo aplica los valores cuando lleguen.
  prefill?: CheckoutPrefill
}

function buildDefaultValues(user: UserProfile): AuthenticatedCheckoutFormValues {
  return {
    customer_first_name: user.first_name ?? "",
    customer_last_name: user.last_name ?? "",
    customer_phone: "",
    shipping_address: "",
    payment_method: enabledPaymentMethodIds()[0],
  }
}

export function AuthenticatedCheckoutForm({
  user,
  onComplete,
  isLoading = false,
  prefill,
}: AuthenticatedCheckoutFormProps) {
  const { register, handleSubmit, formState, setValue } = useForm<AuthenticatedCheckoutFormValues>({
    resolver: zodResolver(authenticatedCheckoutFormSchema),
    defaultValues: buildDefaultValues(user),
  })
  const { dirtyFields } = formState

  // No pisa lo que el usuario ya haya escrito: solo completa un campo si hay
  // un valor con el que precargarlo y ese campo sigue como llegó (sin tocar).
  // El nombre sale del perfil de la cuenta (puede faltar); teléfono y
  // dirección salen del pedido más reciente, que llega de forma asíncrona.
  useEffect(() => {
    if (user.first_name && !dirtyFields.customer_first_name) {
      setValue("customer_first_name", user.first_name)
    }
    if (user.last_name && !dirtyFields.customer_last_name) {
      setValue("customer_last_name", user.last_name)
    }

    if (!prefill) return

    if (prefill.phone && !dirtyFields.customer_phone) {
      setValue("customer_phone", prefill.phone)
    }
    if (prefill.address && !dirtyFields.shipping_address) {
      setValue("shipping_address", prefill.address)
    }
  }, [
    user,
    prefill,
    dirtyFields.customer_first_name,
    dirtyFields.customer_last_name,
    dirtyFields.customer_phone,
    dirtyFields.shipping_address,
    setValue,
  ])

  const submitValidatedForm = (values: AuthenticatedCheckoutFormValues) => {
    onComplete({
      firstName: values.customer_first_name,
      lastName: values.customer_last_name,
      phone: values.customer_phone,
      address: values.shipping_address,
      paymentMethod: values.payment_method,
    })
  }

  const rejectInvalidForm = () => {
    toast.error("Por favor, completa todos los campos requeridos")
  }

  return (
    <form onSubmit={handleSubmit(submitValidatedForm, rejectInvalidForm)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Información de Envío</CardTitle>
          <CardDescription>
            Completa tus datos de contacto y dirección para procesar tu pedido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Información de tu cuenta:</p>
            <p className="text-sm">
              <strong>Correo:</strong> {user.email}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              id="customer_first_name"
              label="Nombre *"
              error={formState.errors.customer_first_name?.message}
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  placeholder="Juan"
                  disabled={isLoading}
                  {...register("customer_first_name")}
                />
              )}
            </FormField>

            <FormField
              id="customer_last_name"
              label="Apellido *"
              error={formState.errors.customer_last_name?.message}
            >
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  placeholder="Pérez"
                  disabled={isLoading}
                  {...register("customer_last_name")}
                />
              )}
            </FormField>
          </div>

          <FormField
            id="customer_phone"
            label="Teléfono / Celular *"
            error={formState.errors.customer_phone?.message}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="tel"
                placeholder="+57 300 123 4567"
                disabled={isLoading}
                {...register("customer_phone")}
              />
            )}
          </FormField>

          <FormField
            id="shipping_address"
            label="Dirección de Envío *"
            error={formState.errors.shipping_address?.message}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                placeholder="Calle 123 #45-67"
                disabled={isLoading}
                {...register("shipping_address")}
              />
            )}
          </FormField>
        </CardContent>
      </Card>

      <PaymentMethodSection
        register={register}
        name="payment_method"
        error={formState.errors.payment_method?.message}
      />

      <SubmitOrderButton isLoading={isLoading} />
    </form>
  )
}
