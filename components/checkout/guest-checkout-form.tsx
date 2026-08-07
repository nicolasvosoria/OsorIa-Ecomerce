"use client"

import { useEffect } from "react"
import { useForm, useWatch, type UseFormReturn } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { PaymentMethodSection } from "@/components/checkout/payment-method-section"
import { SubmitOrderButton } from "@/components/checkout/submit-order-button"
import { ShippingLocationPicker, type ShippingLocationValue } from "@/components/shipping/shipping-location-picker"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { enabledPaymentMethodIds } from "@/lib/checkout/payment-methods"
import { guestCheckoutFormSchema, type GuestCheckoutFormValues } from "@/lib/checkout/schemas"
import type { ShippingDestination } from "@/lib/shipping/resolver"

// Contrato externo del formulario: lo consumen también la página de checkout y
// el fallback de la página de éxito, así que se mantiene en camelCase aunque
// el formulario valide internamente contra el schema compartido (snake_case).
// D2/D30: departmentCode/departmentName/municipalityCode/locationId son la
// copia estructurada que el picker resuelve; city sigue siendo el nombre del
// municipio, mismo campo de siempre.
export interface GuestCustomerData {
  firstName: string
  lastName: string
  email: string
  phone: string
  address: string
  departmentCode?: string
  departmentName?: string
  city?: string
  municipalityCode?: string
  locationId?: string
  postalCode?: string
  country?: string
  notes?: string
  paymentMethod?: string
}

interface GuestCheckoutFormProps {
  onComplete: (customerData: GuestCustomerData) => void
  isLoading?: boolean
  // The checkout page's shipping quote lives outside this form (the order
  // summary card), so it needs the destination the instant the two chained
  // selects resolve one -- long before this form's own onComplete fires at
  // submit.
  onDestinationChange?: (destination: ShippingDestination | null) => void
}

const DEFAULT_VALUES: GuestCheckoutFormValues = {
  customer_first_name: "",
  customer_last_name: "",
  customer_email: "",
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

export function GuestCheckoutForm({ onComplete, isLoading = false, onDestinationChange }: GuestCheckoutFormProps) {
  const form = useForm<GuestCheckoutFormValues>({
    resolver: zodResolver(guestCheckoutFormSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const submitValidatedForm = (values: GuestCheckoutFormValues) => {
    onComplete({
      firstName: values.customer_first_name,
      lastName: values.customer_last_name,
      email: values.customer_email,
      phone: values.customer_phone,
      address: values.shipping_address,
      departmentCode: values.shipping_department_code,
      departmentName: values.shipping_department_name,
      city: values.shipping_city,
      municipalityCode: values.shipping_municipality_code,
      locationId: values.shipping_location_id,
      postalCode: values.shipping_postal_code,
      country: values.shipping_country,
      paymentMethod: values.payment_method,
    })
  }

  const rejectInvalidForm = () => {
    toast.error("Por favor, completa todos los campos requeridos")
  }

  return (
    <form
      onSubmit={form.handleSubmit(submitValidatedForm, rejectInvalidForm)}
      className="space-y-6"
    >
      <ContactInfoCard form={form} isLoading={isLoading} />
      <ShippingAddressCard form={form} isLoading={isLoading} onDestinationChange={onDestinationChange} />
      <PaymentMethodSection
        register={form.register}
        name="payment_method"
        error={form.formState.errors.payment_method?.message}
      />

      <SubmitOrderButton isLoading={isLoading} />
    </form>
  )
}

function ContactInfoCard({
  form,
  isLoading,
}: {
  form: UseFormReturn<GuestCheckoutFormValues>
  isLoading: boolean
}) {
  const { register, formState } = form

  return (
    <Card>
      <CardHeader>
        <CardTitle>Información de Contacto</CardTitle>
        <CardDescription>Completa tus datos para procesar tu pedido</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          id="customer_email"
          label="Correo Electrónico *"
          error={formState.errors.customer_email?.message}
        >
          {(fieldProps) => (
            <Input
              {...fieldProps}
              type="email"
              placeholder="juan.perez@ejemplo.com"
              disabled={isLoading}
              {...register("customer_email")}
            />
          )}
        </FormField>

        <FormField
          id="customer_phone"
          label="Teléfono *"
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
      </CardContent>
    </Card>
  )
}

function ShippingAddressCard({
  form,
  isLoading,
  onDestinationChange,
}: {
  form: UseFormReturn<GuestCheckoutFormValues>
  isLoading: boolean
  onDestinationChange?: (destination: ShippingDestination | null) => void
}) {
  const { register, formState, setValue, control } = form
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

  // Fires on every source of a destination change, picked manually or
  // applied from a prefill -- both land here through the same watched
  // fields, so there is exactly one place that reports "the destination is
  // now this" upward.
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dirección de Envío</CardTitle>
        <CardDescription>Ingresa la dirección donde deseas recibir tu pedido</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          id="shipping_address"
          label="Dirección *"
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
  )
}
