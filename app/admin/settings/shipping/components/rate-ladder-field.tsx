"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Controller, useFieldArray, useWatch, type Control } from "react-hook-form"
import { AlertCircle, Info, Plus, Trash2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { translations } from "@/lib/i18n/translations"
import {
  SHIPPING_RATE_BASES,
  findShippingLadderGaps,
  parseShippingLadderRangeBounds,
  shippingRateBasisLabelKey,
  type ShippingRateRangeRowValues,
  type ZoneEditorFormValues,
} from "@/lib/shipping/schemas"
import type { MissingWeightProduct } from "@/lib/supabase/shipping-zones-api"

const copy = translations.es.shipping.zones

// D6: covers 0..infinity trivially and needs no bounds, so switching INTO a
// ranged basis for the first time starts the ladder at 0 -- the owner only
// has to pick where the first range ends.
export const EMPTY_RANGE_ROW = { from: "0", to: "", amount: "" }

const EMPTY_RANGES: ShippingRateRangeRowValues[] = []

export function RateLadderField({
  control,
  missingWeightProducts,
}: {
  control: Control<ZoneEditorFormValues>
  missingWeightProducts: MissingWeightProduct[]
}) {
  const basis = useWatch({ control, name: "rateLadder.basis" })
  // The `?? EMPTY_RANGES` fallback reuses one stable module-level reference
  // instead of a fresh `[]` literal every render, so gapIssues' useMemo below
  // doesn't see `ranges` as "changed" on every render it isn't.
  const ranges = useWatch({ control, name: "rateLadder.ranges" }) ?? EMPTY_RANGES
  const { fields, append, remove } = useFieldArray({ control, name: "rateLadder.ranges" })

  // parseShippingLadderRangeBounds only requires from/to to be valid, never
  // amount -- so a row whose Monto is still blank while an owner is mid-edit
  // doesn't take the whole gap/overlap check down with it (unlike parsing
  // through the strict, amount-included shippingRateLadderSchema).
  const gapIssues = useMemo(() => {
    if (basis === "flat") return []
    const bounds = parseShippingLadderRangeBounds(ranges)
    return bounds ? findShippingLadderGaps({ basis, ranges: bounds }) : []
  }, [basis, ranges])

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="space-y-2">
        <Label htmlFor="rate-ladder-basis">{copy.basisLabel}</Label>
        <Controller
          control={control}
          name="rateLadder.basis"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="rate-ladder-basis" className="w-full sm:w-72">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="editor-chrome">
                {SHIPPING_RATE_BASES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {copy[shippingRateBasisLabelKey(option)]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {basis === "flat" ? (
        <div className="space-y-2">
          <Label htmlFor="rate-ladder-amount">{copy.flatAmountLabel}</Label>
          <Controller
            control={control}
            name="rateLadder.amount"
            render={({ field, fieldState }) => (
              <>
                <Input
                  id="rate-ladder-amount"
                  type="number"
                  min="0"
                  aria-invalid={fieldState.error ? true : undefined}
                  {...field}
                />
                <FieldError message={fieldState.error?.message} />
              </>
            )}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{copy.rangesLabel}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => append({ ...EMPTY_RANGE_ROW, from: ranges.at(-1)?.to || "" })}
            >
              <Plus className="h-4 w-4" /> {copy.addRangeButton}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{copy.rangesFreeShippingHint}</p>

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
              <RangeBoundField control={control} index={index} name="from" label={copy.rangeFromLabel} />
              <RangeBoundField
                control={control}
                index={index}
                name="to"
                label={copy.rangeToLabel}
                placeholder={copy.rangeToPlaceholder}
              />
              <RangeBoundField control={control} index={index} name="amount" label={copy.rangeAmountLabel} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={copy.removeRangeLabel}
                disabled={fields.length <= 1}
                onClick={() => remove(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {gapIssues.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {gapIssues.map((issue, index) => (
                  <p key={index}>{issue.message}</p>
                ))}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      )}

      <p className="text-xs text-muted-foreground">{copy.codCommissionNote}</p>

      {basis === "weight" && missingWeightProducts.length > 0 ? (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>{copy.missingWeightTitle}</AlertTitle>
          <AlertDescription>
            <p>{copy.missingWeightDescription}</p>
            <ul className="list-disc space-y-1 pl-4">
              {missingWeightProducts.map((product) => (
                <li key={product.id}>
                  {product.name}{" "}
                  <Link href={`/admin/products/${product.id}/edit`} className="underline">
                    {copy.viewProductLink}
                  </Link>
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}

function RangeBoundField({
  control,
  index,
  name,
  label,
  placeholder,
}: {
  control: Control<ZoneEditorFormValues>
  index: number
  name: "from" | "to" | "amount"
  label: string
  placeholder?: string
}) {
  const fieldName = `rateLadder.ranges.${index}.${name}` as const

  return (
    <div className="space-y-1">
      <Label htmlFor={fieldName} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Controller
        control={control}
        name={fieldName}
        render={({ field, fieldState }) => (
          <>
            <Input
              id={fieldName}
              type="number"
              min="0"
              placeholder={placeholder}
              aria-invalid={fieldState.error ? true : undefined}
              {...field}
            />
            <FieldError message={fieldState.error?.message} />
          </>
        )}
      />
    </div>
  )
}
