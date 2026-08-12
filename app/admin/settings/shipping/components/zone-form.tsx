"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm, type Control, type FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown, Loader2, Save, X } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { FieldError } from "@/components/ui/field-error"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { translations } from "@/lib/i18n/translations"
import type { Department, Municipality } from "@/lib/shipping/locations-api"
import {
  destinationKey,
  findShippingLadderGaps,
  shippingRateLadderSchema,
  shippingZoneFormSchema,
  toRateLadderPayload,
  type ShippingRateLadder,
  type ZoneEditorFormValues,
} from "@/lib/shipping/schemas"
import type { MissingWeightProduct, ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"
import { listShippingMunicipalitiesAction, saveShippingZoneAction } from "../actions"
import { EMPTY_RANGE_ROW, RateLadderField } from "./rate-ladder-field"

const copy = translations.es.shipping.zones

const SHIPPING_ZONES_LIST_PATH = "/admin/settings/shipping"

function toRateLadderFormValues(ladder: ShippingRateLadder): ZoneEditorFormValues["rateLadder"] {
  if (ladder.basis === "flat") {
    return { basis: "flat", amount: ladder.amount, ranges: [EMPTY_RANGE_ROW] }
  }
  return { basis: ladder.basis, amount: "0", ranges: ladder.ranges }
}

function toDefaultValues(zone: ShippingZoneRecord | null): ZoneEditorFormValues {
  if (!zone) {
    return {
      name: "",
      destinations: [],
      rateLadder: { basis: "flat", amount: "0", ranges: [EMPTY_RANGE_ROW] },
    }
  }

  return {
    name: zone.name,
    destinations: zone.destinations.map((destination) => ({
      departmentCode: destination.departmentCode,
      municipalityCode: destination.municipalityCode,
    })),
    rateLadder: toRateLadderFormValues(zone.rateLadder),
  }
}

function nameHintKey(kind: "department" | "municipality", code: string): string {
  return `${kind}:${code}`
}

function buildNameHints(zone: ShippingZoneRecord | null): Map<string, string> {
  const hints = new Map<string, string>()
  for (const destination of zone?.destinations ?? []) {
    hints.set(nameHintKey("department", destination.departmentCode), destination.departmentName)
    if (destination.municipalityCode && destination.municipalityName) {
      hints.set(nameHintKey("municipality", destination.municipalityCode), destination.municipalityName)
    }
  }
  return hints
}

export function ZoneForm({
  zoneId,
  zone,
  departments,
  missingWeightProducts,
}: {
  zoneId: string | null
  zone: ShippingZoneRecord | null
  departments: Department[]
  missingWeightProducts: MissingWeightProduct[]
}) {
  const router = useRouter()
  const nameHints = useMemo(() => buildNameHints(zone), [zone])

  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ZoneEditorFormValues>({
    resolver: zodResolver(shippingZoneFormSchema),
    defaultValues: toDefaultValues(zone),
  })

  // Takes handleSubmit's own validated payload instead of re-reading the
  // form with getValues(): one reading of the form, not two that can quietly
  // differ (the resolver trims `name`; a second, untrimmed read would have
  // undone that).
  async function onSubmit(values: ZoneEditorFormValues) {
    const ladderPayload = toRateLadderPayload(values.rateLadder)
    const parsedLadder = shippingRateLadderSchema.safeParse(ladderPayload)
    if (!parsedLadder.success) {
      // looseRateLadderFieldSchema (the resolver's own schema) never fails on
      // the ladder, so this is the only place a broken row/amount is ever
      // caught -- surfaced on the exact field RateLadderField renders
      // (rate-ladder-field.tsx's Controllers read fieldState off this SAME
      // control), the same "inline error, no toast" treatment name/destinations
      // already get from the resolver above.
      for (const issue of parsedLadder.error.issues) {
        setError(`rateLadder.${issue.path.join(".")}` as FieldPath<ZoneEditorFormValues>, {
          type: "manual",
          message: issue.message,
        })
      }
      return
    }

    const gapIssues = findShippingLadderGaps(parsedLadder.data)
    if (gapIssues.length > 0) {
      // D6 is a cross-row invariant, not one field's fault -- one toast per
      // issue (same "several problems, several toasts" shape processOrder
      // already uses in app/checkout/page.tsx for stock errors) so fixing the
      // first one doesn't just uncover a second the owner was never shown.
      gapIssues.forEach((issue) => toast.error(issue.message))
      return
    }

    const result = await saveShippingZoneAction(
      { name: values.name, destinations: values.destinations, rateLadder: parsedLadder.data },
      zoneId ?? undefined,
    )

    if (!result.success) {
      toast.error(result.error || copy.saveErrorToast)
      return
    }

    toast.success(copy.savedToast)
    router.push(SHIPPING_ZONES_LIST_PATH)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{copy.formTitle}</CardTitle>
        <CardDescription>{copy.formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
          <FormField id="zone-name" label={copy.nameLabel} error={errors.name?.message}>
            {(field) => <Input {...field} placeholder={copy.namePlaceholder} {...register("name")} />}
          </FormField>

          <DestinationsField control={control} departments={departments} nameHints={nameHints} />
          <FieldError message={errors.destinations?.message} />

          <RateLadderField control={control} missingWeightProducts={missingWeightProducts} />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" asChild>
              <Link href={SHIPPING_ZONES_LIST_PATH}>{copy.cancelButton}</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSubmitting ? copy.saving : copy.saveButton}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function DestinationsField({
  control,
  departments,
  nameHints,
}: {
  control: Control<ZoneEditorFormValues>
  departments: Department[]
  nameHints: Map<string, string>
}) {
  const { fields, append, remove } = useFieldArray({ control, name: "destinations" })
  const [names, setNames] = useState(nameHints)
  const [selectedDepartment, setSelectedDepartment] = useState("")
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false)
  const [municipalityPickerOpen, setMunicipalityPickerOpen] = useState(false)

  // Fetches, not a state mirror: the effect's only job is asking the server
  // for the chosen department's municipios, so it stays an effect. Every
  // setState the effect body itself would need synchronously (clearing the
  // previous department's stale list, flagging the fetch as loading) instead
  // happens in the SELECT handler below that causes it -- only the async
  // .then/.finally callbacks reporting the fetch's own outcome set state
  // from here, the "derive it from the event that caused it" shape React's
  // own effect guidance asks for.
  useEffect(() => {
    if (!selectedDepartment) return

    let active = true
    listShippingMunicipalitiesAction(selectedDepartment)
      .then((result) => {
        if (active) setMunicipalities(result)
      })
      .catch((error) => console.error("[Shipping Zones] Error al cargar municipios:", error))
      .finally(() => {
        if (active) setLoadingMunicipalities(false)
      })

    return () => {
      active = false
    }
  }, [selectedDepartment])

  function selectDepartment(departmentCode: string) {
    setSelectedDepartment(departmentCode)
    setMunicipalities([])
    setLoadingMunicipalities(true)
  }

  // departmentName falls back to the `departments` prop directly instead of
  // seeding it into `names` on every prop change: `names` only needs to hold
  // hints the prop can't supply (a destination's name once picked, or an
  // already-saved zone's own destinations).
  function departmentName(departmentCode: string): string {
    return (
      names.get(nameHintKey("department", departmentCode)) ??
      departments.find((department) => department.code === departmentCode)?.name ??
      departmentCode
    )
  }

  const existingKeys = new Set(fields.map(destinationKey))

  function addWholeDepartment() {
    if (!selectedDepartment || existingKeys.has(destinationKey({ departmentCode: selectedDepartment, municipalityCode: null }))) return
    append({ departmentCode: selectedDepartment, municipalityCode: null })
  }

  function addMunicipality(municipality: Municipality) {
    if (existingKeys.has(destinationKey({ departmentCode: municipality.departmentCode, municipalityCode: municipality.code }))) return

    setNames((current) => {
      const next = new Map(current)
      next.set(nameHintKey("department", municipality.departmentCode), municipality.departmentName)
      next.set(nameHintKey("municipality", municipality.code), municipality.name)
      return next
    })
    append({ departmentCode: municipality.departmentCode, municipalityCode: municipality.code })
    setMunicipalityPickerOpen(false)
  }

  return (
    <div className="space-y-3">
      <Label>{copy.destinationsLabel}</Label>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Select value={selectedDepartment} onValueChange={selectDepartment}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue placeholder={copy.departmentPlaceholder} />
          </SelectTrigger>
          <SelectContent className="editor-chrome">
            {departments.map((department) => (
              <SelectItem key={department.code} value={department.code}>
                {department.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" disabled={!selectedDepartment} onClick={addWholeDepartment}>
          {copy.addWholeDepartmentButton}
        </Button>
      </div>

      {selectedDepartment ? (
        <Popover open={municipalityPickerOpen} onOpenChange={setMunicipalityPickerOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="w-full justify-between sm:w-72">
              {copy.addMunicipalityButton}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="editor-chrome w-72 p-0">
            <Command>
              <CommandInput placeholder={copy.municipalitySearchPlaceholder} />
              <CommandList>
                <CommandEmpty>{loadingMunicipalities ? copy.loadingMunicipalities : copy.noMunicipalitiesFound}</CommandEmpty>
                <CommandGroup>
                  {municipalities.map((municipality) => {
                    const alreadyAdded = existingKeys.has(
                      destinationKey({ departmentCode: municipality.departmentCode, municipalityCode: municipality.code }),
                    )
                    return (
                      <CommandItem
                        key={municipality.id}
                        value={municipality.name}
                        disabled={alreadyAdded}
                        onSelect={() => addMunicipality(municipality)}
                      >
                        <Check className={alreadyAdded ? "mr-2 h-4 w-4 opacity-100" : "mr-2 h-4 w-4 opacity-0"} />
                        {municipality.name}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {fields.map((field, index) => {
          const label = field.municipalityCode
            ? names.get(nameHintKey("municipality", field.municipalityCode)) ?? field.municipalityCode
            : `${copy.wholeDepartmentPrefix} ${departmentName(field.departmentCode)}`

          return (
            <Badge key={field.id} variant="secondary" className="gap-1.5 normal-case">
              {label}
              <button type="button" onClick={() => remove(index)} aria-label={copy.removeDestinationLabel}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )
        })}
      </div>
    </div>
  )
}
