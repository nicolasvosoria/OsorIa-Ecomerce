"use client"

import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { translations } from "@/lib/i18n/translations"
import {
  SELECTABLE_SHIPPING_MODES,
  shippingModeFormSchema,
  shippingModeLabelKey,
  type ShippingModeFormValues,
} from "@/lib/shipping/schemas"
import { updateShippingModeAction } from "../actions"

const copy = translations.es.shipping

export function ShippingModeForm({ defaultValues }: { defaultValues: ShippingModeFormValues }) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ShippingModeFormValues>({
    resolver: zodResolver(shippingModeFormSchema),
    defaultValues,
  })

  const onSubmit = async (values: ShippingModeFormValues) => {
    const result = await updateShippingModeAction(values)
    if (result.success) {
      toast.success(copy.savedToast)
    } else {
      toast.error(result.error || copy.saveErrorToast)
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{copy.settingsTitle}</CardTitle>
          <CardDescription>{copy.settingsSubtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField id="shipping-mode" label={copy.modeLabel}>
            {(field) => (
              <Controller
                control={control}
                name="mode"
                render={({ field: mode }) => (
                  <Select value={mode.value} onValueChange={mode.onChange}>
                    <SelectTrigger {...field} className="w-full sm:w-80">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="editor-chrome">
                      {SELECTABLE_SHIPPING_MODES.map((option) => (
                        <SelectItem key={option} value={option}>
                          {copy[shippingModeLabelKey(option)]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSubmitting ? copy.saving : copy.saveButton}
        </Button>
      </div>
    </form>
  )
}
