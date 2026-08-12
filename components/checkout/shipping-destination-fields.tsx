"use client"

import { useEffect } from "react"
import { useWatch, type Control, type FieldValues, type Path, type UseFormRegister, type UseFormSetValue } from "react-hook-form"

import { ShippingLocationPicker, type ShippingLocationValue } from "@/components/shipping/shipping-location-picker"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/contexts/language-context"
import type { ShippingDestination } from "@/lib/shipping/schemas"

type ShippingDestinationFieldValues = {
  shipping_department_code: string
  shipping_department_name: string
  shipping_city: string
  shipping_municipality_code: string
  shipping_location_id: string
  shipping_postal_code?: string
  shipping_country?: string
}

// D24: the destination block both checkout forms carry -- the two chained
// selects, the postal-code/country pair, and the effect that reports a
// picked destination up to the checkout page's live quote (which needs it
// the instant the two selects resolve one, long before either form's own
// onComplete fires at submit) -- shared so a field added here can't land in
// one form and not the other.
export function ShippingDestinationFields<TFieldValues extends FieldValues & ShippingDestinationFieldValues>({
  control,
  setValue,
  register,
  departmentError,
  municipalityError,
  isLoading = false,
  onDestinationChange,
}: {
  control: Control<TFieldValues>
  setValue: UseFormSetValue<TFieldValues>
  register: UseFormRegister<TFieldValues>
  departmentError?: string
  municipalityError?: string
  isLoading?: boolean
  onDestinationChange?: (destination: ShippingDestination | null) => void
}) {
  const { t } = useLanguage()
  const [departmentCode, departmentName, municipalityCode, locationId, city] = useWatch({
    control,
    name: [
      "shipping_department_code" as Path<TFieldValues>,
      "shipping_department_name" as Path<TFieldValues>,
      "shipping_municipality_code" as Path<TFieldValues>,
      "shipping_location_id" as Path<TFieldValues>,
      "shipping_city" as Path<TFieldValues>,
    ],
  }) as unknown as [string, string, string, string, string]

  // Fires on every source of a destination change, picked manually or
  // applied from a prefill -- both land here through the same watched
  // fields, so there is exactly one place that reports "the destination is
  // now this" upward.
  useEffect(() => {
    onDestinationChange?.(departmentCode && municipalityCode ? { departmentCode, municipalityCode } : null)
  }, [departmentCode, municipalityCode, onDestinationChange])

  const applyLocation = (next: ShippingLocationValue) => {
    setValue("shipping_department_code" as Path<TFieldValues>, next.departmentCode as any, { shouldValidate: true })
    setValue("shipping_department_name" as Path<TFieldValues>, next.departmentName as any, { shouldValidate: true })
    setValue("shipping_municipality_code" as Path<TFieldValues>, next.municipalityCode as any, { shouldValidate: true })
    setValue("shipping_location_id" as Path<TFieldValues>, next.municipalityId as any, { shouldValidate: true })
    setValue("shipping_city" as Path<TFieldValues>, next.municipalityName as any, { shouldValidate: true })
  }

  return (
    <>
      <ShippingLocationPicker
        value={{
          departmentCode: departmentCode || "",
          departmentName: departmentName || "",
          municipalityCode: municipalityCode || "",
          municipalityId: locationId || "",
          municipalityName: city || "",
        }}
        onChange={applyLocation}
        departmentError={departmentError}
        municipalityError={municipalityError}
        disabled={isLoading}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField id="shipping_postal_code" label={t.checkout.postalCode}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              placeholder="110111"
              disabled={isLoading}
              {...register("shipping_postal_code" as Path<TFieldValues>)}
            />
          )}
        </FormField>

        <FormField id="shipping_country" label={t.checkout.country}>
          {(fieldProps) => (
            <Input
              {...fieldProps}
              placeholder="Colombia"
              disabled={isLoading}
              {...register("shipping_country" as Path<TFieldValues>)}
            />
          )}
        </FormField>
      </div>
    </>
  )
}
