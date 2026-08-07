"use client"

import { useEffect } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { PaymentMethodSection } from "@/components/checkout/payment-method-section"
import { SubmitOrderButton } from "@/components/checkout/submit-order-button"
import { ShippingLocationPicker, type ShippingLocationValue } from "@/components/shipping/shipping-location-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { enabledPaymentMethodIds } from "@/lib/checkout/payment-methods"
import {
  authenticatedCheckoutFormSchema,
  type AuthenticatedCheckoutFormValues,
} from "@/lib/checkout/schemas"
import type { ShippingDestination } from "@/lib/shipping/resolver"
import type { UserProfile } from "@/lib/types/user"
import type { CheckoutPrefill } from "@/app/checkout/actions"

// D24: el checkout autenticado envía exactamente lo mismo que arma
// GuestCheckoutForm's submitValidatedForm (ver ese componente) -- misma
// tarjeta de envío, mismos campos.
export interface AuthenticatedCheckoutData {
  firstName: string
  lastName: string
  phone: string
  address: string
  departmentCode: string
  departmentName: string
  city: string
  municipalityCode: string
  locationId: string
  postalCode: string
  country: string
  paymentMethod: string
}

interface AuthenticatedCheckoutFormProps {
  user: UserProfile
  onComplete: (data: AuthenticatedCheckoutData) => void
  isLoading?: boolean
  // Llega de forma asíncrona (D4): el formulario nunca espera por esto para
  // renderizarse, solo aplica los valores cuando lleguen.
  prefill?: CheckoutPrefill
  // The checkout page's shipping quote lives outside this form (the order
  // summary card), so it needs the destination the instant the two chained
  // selects resolve one -- long before this form's own onComplete fires at
  // submit.
  onDestinationChange?: (destination: ShippingDestination | null) => void
}

function buildDefaultValues(user: UserProfile): AuthenticatedCheckoutFormValues {
  return {
    customer_first_name: user.first_name ?? "",
    customer_last_name: user.last_name ?? "",
    customer_phone: "",
    shipping_address: "",
    shipping_department_code: "",
    shipping_department_name: "",
    shipping_city: "",
    shipping_municipality_code: "",
    shipping_location_id: "",
    shipping_postal_code: "",
    shipping_country: "Colombia",
    payment_method: enabledPaymentMethodIds()[0],
  }
}

export function AuthenticatedCheckoutForm({
  user,
  onComplete,
  isLoading = false,
  prefill,
  onDestinationChange,
}: AuthenticatedCheckoutFormProps) {
  const { register, handleSubmit, formState, setValue, control } = useForm<AuthenticatedCheckoutFormValues>({
    resolver: zodResolver(authenticatedCheckoutFormSchema),
    defaultValues: buildDefaultValues(user),
  })
  const { dirtyFields } = formState
  const [departmentCode, departmentName, municipalityCode, locationId, city] = useWatch({
    control,
    name: [
      "shipping_department_code",
      "shipping_department_name",
      "shipping_municipality_code",
      "shipping_location_id",
      "shipping_city",
    ],
  })

  // No pisa lo que el usuario ya haya escrito: solo completa un campo si hay
  // un valor con el que precargarlo y ese campo sigue como llegó (sin tocar).
  // El nombre sale del perfil de la cuenta (puede faltar); teléfono, dirección
  // y el destino estructurado (departamento/municipio) salen de la dirección
  // guardada por defecto (D24, ver getCheckoutPrefill), que llega de forma
  // asíncrona.
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
    if (prefill.locationId && !dirtyFields.shipping_location_id) {
      setValue("shipping_department_code", prefill.departmentCode, { shouldValidate: true })
      setValue("shipping_department_name", prefill.departmentName, { shouldValidate: true })
      setValue("shipping_city", prefill.city, { shouldValidate: true })
      setValue("shipping_municipality_code", prefill.municipalityCode, { shouldValidate: true })
      setValue("shipping_location_id", prefill.locationId, { shouldValidate: true })
    }
  }, [
    user,
    prefill,
    dirtyFields.customer_first_name,
    dirtyFields.customer_last_name,
    dirtyFields.customer_phone,
    dirtyFields.shipping_address,
    dirtyFields.shipping_location_id,
    setValue,
  ])

  // Fires on every source of a destination change, picked manually or
  // applied from the prefill above -- both land here through the same
  // watched fields, so there is exactly one place that reports "the
  // destination is now this" upward.
  useEffect(() => {
    onDestinationChange?.(departmentCode && municipalityCode ? { departmentCode, municipalityCode } : null)
  }, [departmentCode, municipalityCode, onDestinationChange])

  const applyLocation = (next: ShippingLocationValue) => {
    setValue("shipping_department_code", next.departmentCode, { shouldValidate: true })
    setValue("shipping_department_name", next.departmentName, { shouldValidate: true })
    setValue("shipping_municipality_code", next.municipalityCode, { shouldValidate: true })
    setValue("shipping_location_id", next.municipalityId, { shouldValidate: true })
    setValue("shipping_city", next.municipalityName, { shouldValidate: true })
  }

  const submitValidatedForm = (values: AuthenticatedCheckoutFormValues) => {
    onComplete({
      firstName: values.customer_first_name,
      lastName: values.customer_last_name,
      phone: values.customer_phone,
      address: values.shipping_address,
      departmentCode: values.shipping_department_code,
      departmentName: values.shipping_department_name,
      city: values.shipping_city,
      municipalityCode: values.shipping_municipality_code,
      locationId: values.shipping_location_id,
      postalCode: values.shipping_postal_code ?? "",
      country: values.shipping_country ?? "",
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

          <ShippingLocationPicker
            value={{
              departmentCode: departmentCode || "",
              departmentName: departmentName || "",
              municipalityCode: municipalityCode || "",
              municipalityId: locationId || "",
              municipalityName: city || "",
            }}
            onChange={applyLocation}
            departmentError={formState.errors.shipping_department_code?.message}
            municipalityError={
              formState.errors.shipping_location_id?.message ?? formState.errors.shipping_city?.message
            }
            disabled={isLoading}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="shipping_postal_code" label="Código Postal (opcional)">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  placeholder="110111"
                  disabled={isLoading}
                  {...register("shipping_postal_code")}
                />
              )}
            </FormField>

            <FormField id="shipping_country" label="País (opcional)">
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  placeholder="Colombia"
                  disabled={isLoading}
                  {...register("shipping_country")}
                />
              )}
            </FormField>
          </div>
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
