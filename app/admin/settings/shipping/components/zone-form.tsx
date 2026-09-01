"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm, type Control, type FieldPath } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, Loader2, Save } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { translations } from "@/lib/i18n/translations"
import { MUNICIPALITY_SEARCH_MIN_LENGTH, type Department, type Municipality } from "@/lib/shipping/locations-api"
import {
  destinationKey,
  findShippingLadderGaps,
  shippingRateLadderSchema,
  shippingZoneFormSchema,
  toRateLadderPayload,
  type ShippingRateLadder,
  type ZoneEditorFormValues,
} from "@/lib/shipping/schemas"
import type {
  ClaimedDestination,
  MissingWeightProduct,
  ShippingZoneRecord,
} from "@/lib/supabase/shipping-zones-api"
import {
  listShippingMunicipalitiesAction,
  saveShippingZoneAction,
  searchShippingMunicipalitiesAction,
} from "../actions"
import { EMPTY_RANGE_ROW, RateLadderField } from "./rate-ladder-field"

const copy = translations.es.shipping.zones

const SHIPPING_ZONES_LIST_PATH = "/admin/settings/shipping"

const DESTINATIONS_LABEL_ID = "zone-destinations-label"
const DESTINATIONS_ERROR_ID = "zone-destinations-error"

type DestinationValue = ZoneEditorFormValues["destinations"][number]

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

export function ZoneForm({
  zoneId,
  zone,
  departments,
  missingWeightProducts,
  claimedDestinations = [],
}: {
  zoneId: string | null
  zone: ShippingZoneRecord | null
  departments: Department[]
  missingWeightProducts: MissingWeightProduct[]
  claimedDestinations?: ClaimedDestination[]
}) {
  const router = useRouter()

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
        <CardTitle asChild className="text-base">
          <h2>{copy.formTitle}</h2>
        </CardTitle>
        <CardDescription>{copy.formDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
          <FormField id="zone-name" label={copy.nameLabel} error={errors.name?.message}>
            {(field) => <Input {...field} placeholder={copy.namePlaceholder} {...register("name")} />}
          </FormField>

          <DestinationsField
            control={control}
            departments={departments}
            claimedDestinations={claimedDestinations}
            errorMessage={errors.destinations?.message}
          />

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

function withoutDepartment(destinations: DestinationValue[], departmentCode: string): DestinationValue[] {
  return destinations.filter((destination) => destination.departmentCode !== departmentCode)
}

function nextDestinationsForWholeDepartment(
  destinations: DestinationValue[],
  departmentCode: string,
  checked: boolean,
): DestinationValue[] {
  const rest = withoutDepartment(destinations, departmentCode)
  return checked ? [...rest, { departmentCode, municipalityCode: null }] : rest
}

function nextDestinationsForMunicipality(
  destinations: DestinationValue[],
  municipality: Municipality,
  checked: boolean,
): DestinationValue[] {
  const key = destinationKey({ departmentCode: municipality.departmentCode, municipalityCode: municipality.code })
  const rest = destinations.filter((destination) => destinationKey(destination) !== key)
  return checked
    ? [...rest, { departmentCode: municipality.departmentCode, municipalityCode: municipality.code }]
    : rest
}

function selectableWholeDepartments(departments: Department[], claimedByKey: Map<string, string>): DestinationValue[] {
  return departments
    .filter((department) => !claimedByKey.has(destinationKey({ departmentCode: department.code, municipalityCode: null })))
    .map((department) => ({ departmentCode: department.code, municipalityCode: null }))
}

function claimedDestinationsByKey(claimedDestinations: ClaimedDestination[]): Map<string, string> {
  return new Map(
    claimedDestinations.map((destination) => [
      destinationKey({ departmentCode: destination.departmentCode, municipalityCode: destination.municipalityCode }),
      destination.zoneName,
    ]),
  )
}

function existingDestinationKeys(destinations: DestinationValue[]): Set<string> {
  return new Set(destinations.map(destinationKey))
}

function wholeDepartmentCodesOf(destinations: DestinationValue[]): Set<string> {
  return new Set(
    destinations.filter((destination) => destination.municipalityCode === null).map((destination) => destination.departmentCode),
  )
}

function groupMunicipalityCodesByDepartment(destinations: DestinationValue[]): Map<string, Set<string>> {
  const codesByDepartment = new Map<string, Set<string>>()
  for (const destination of destinations) {
    if (destination.municipalityCode === null) continue
    const codes = codesByDepartment.get(destination.departmentCode) ?? new Set<string>()
    codes.add(destination.municipalityCode)
    codesByDepartment.set(destination.departmentCode, codes)
  }
  return codesByDepartment
}

function ClaimedByBadge({ id, zoneName }: { id?: string; zoneName: string }) {
  return (
    <Badge id={id} variant="outline" className="normal-case">
      {`${copy.claimedByPrefix} "${zoneName}"`}
    </Badge>
  )
}

const EMPTY_MUNICIPALITY_CODES = new Set<string>()

function DestinationsField({
  control,
  departments,
  claimedDestinations,
  errorMessage,
}: {
  control: Control<ZoneEditorFormValues>
  departments: Department[]
  claimedDestinations: ClaimedDestination[]
  errorMessage?: string
}) {
  const { fields, replace } = useFieldArray({ control, name: "destinations" })
  const claimedByKey = useMemo(() => claimedDestinationsByKey(claimedDestinations), [claimedDestinations])

  const existingKeys = existingDestinationKeys(fields)
  const wholeDepartmentCodes = wholeDepartmentCodesOf(fields)
  const municipalityCodesByDepartment = groupMunicipalityCodesByDepartment(fields)

  function toggleDepartmentWhole(departmentCode: string, checked: boolean) {
    replace(nextDestinationsForWholeDepartment(fields, departmentCode, checked))
  }

  function toggleMunicipality(municipality: Municipality, checked: boolean) {
    replace(nextDestinationsForMunicipality(fields, municipality, checked))
  }

  function selectAllDepartments() {
    const nextDestinations = selectableWholeDepartments(departments, claimedByKey)
    replace(nextDestinations)
    toast.success(copy.selectedAllDestinationsToast.replace("{count}", String(nextDestinations.length)))
  }

  return (
    <div
      role="group"
      aria-labelledby={DESTINATIONS_LABEL_ID}
      aria-describedby={errorMessage ? DESTINATIONS_ERROR_ID : undefined}
      className="space-y-3"
    >
      <Label id={DESTINATIONS_LABEL_ID}>{copy.destinationsLabel}</Label>

      <MunicipalitySearchField
        wholeDepartmentCodes={wholeDepartmentCodes}
        existingKeys={existingKeys}
        claimedByKey={claimedByKey}
        onSelect={(municipality) => toggleMunicipality(municipality, true)}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-3">
          <Button type="button" variant="outline" size="sm" onClick={selectAllDepartments}>
            {copy.selectAllDepartmentsButton}
          </Button>
          <ClearDestinationsButton count={fields.length} onConfirm={() => replace([])} />
        </div>
        <p className="text-sm text-muted-foreground">
          {fields.length} {copy.selectedDestinationsCountLabel}
        </p>
      </div>

      <div className="max-h-96 divide-y overflow-y-auto rounded-md border">
        {departments.map((department) => (
          <DepartmentRow
            key={department.code}
            department={department}
            claimedByKey={claimedByKey}
            wholeSelected={wholeDepartmentCodes.has(department.code)}
            selectedMunicipalityCodes={municipalityCodesByDepartment.get(department.code) ?? EMPTY_MUNICIPALITY_CODES}
            onToggleWhole={(checked) => toggleDepartmentWhole(department.code, checked)}
            onToggleMunicipality={toggleMunicipality}
          />
        ))}
      </div>

      <FieldError id={DESTINATIONS_ERROR_ID} message={errorMessage} />
    </div>
  )
}

function ClearDestinationsButton({ count, onConfirm }: { count: number; onConfirm: () => void }) {
  const [open, setOpen] = useState(false)

  function handleConfirm() {
    onConfirm()
    setOpen(false)
    toast.success(copy.clearedDestinationsToast)
  }

  if (count === 0) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={onConfirm}>
        {copy.clearDestinationsButton}
      </Button>
    )
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="sm">
          {copy.clearDestinationsButton}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="editor-chrome">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.clearDestinationsConfirmTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {copy.clearDestinationsConfirmDescription.replace("{count}", String(count))}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{copy.cancelButton}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              handleConfirm()
            }}
          >
            {copy.clearDestinationsConfirmButton}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DepartmentRow({
  department,
  claimedByKey,
  wholeSelected,
  selectedMunicipalityCodes,
  onToggleWhole,
  onToggleMunicipality,
}: {
  department: Department
  claimedByKey: Map<string, string>
  wholeSelected: boolean
  selectedMunicipalityCodes: Set<string>
  onToggleWhole: (checked: boolean) => void
  onToggleMunicipality: (municipality: Municipality, checked: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false)
  const [municipalitiesError, setMunicipalitiesError] = useState(false)

  useEffect(() => {
    if (!expanded) return

    let active = true
    listShippingMunicipalitiesAction(department.code)
      .then((result) => {
        if (active) setMunicipalities(result)
      })
      .catch((error) => {
        console.error("[Shipping Zones] Error al cargar municipios:", error)
        if (active) setMunicipalitiesError(true)
      })
      .finally(() => {
        if (active) setLoadingMunicipalities(false)
      })

    return () => {
      active = false
    }
  }, [expanded, department.code])

  function toggleExpanded() {
    if (!expanded) {
      setLoadingMunicipalities(true)
      setMunicipalitiesError(false)
    }
    setExpanded((current) => !current)
  }

  const claimedWholeBy = claimedByKey.get(destinationKey({ departmentCode: department.code, municipalityCode: null }))
  const checkboxId = `department-${department.code}`
  const claimedDescriptionId = claimedWholeBy ? `${checkboxId}-claimed` : undefined

  return (
    <div className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox
          id={checkboxId}
          checked={wholeSelected}
          aria-disabled={claimedWholeBy ? true : undefined}
          aria-describedby={claimedDescriptionId}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          onCheckedChange={(checked) => {
            if (claimedWholeBy) return
            onToggleWhole(checked === true)
          }}
        />
        <Label
          htmlFor={checkboxId}
          className="min-w-0 flex-1 cursor-pointer max-md:flex max-md:min-h-11 max-md:items-center peer-aria-disabled:cursor-not-allowed peer-aria-disabled:opacity-70"
        >
          {department.name}
        </Label>
        {claimedWholeBy ? (
          <ClaimedByBadge id={claimedDescriptionId} zoneName={claimedWholeBy} />
        ) : selectedMunicipalityCodes.size > 0 ? (
          <span className="text-xs text-muted-foreground">
            {selectedMunicipalityCodes.size} {copy.selectedMunicipalitiesCountLabel}
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1"
          aria-expanded={expanded}
          onClick={toggleExpanded}
        >
          {expanded ? copy.hideMunicipalitiesButton : copy.showMunicipalitiesButton}
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {expanded ? (
        <MunicipalityChecklist
          loading={loadingMunicipalities}
          error={municipalitiesError}
          municipalities={municipalities}
          claimedByKey={claimedByKey}
          wholeSelected={wholeSelected}
          selectedMunicipalityCodes={selectedMunicipalityCodes}
          onToggleMunicipality={onToggleMunicipality}
        />
      ) : null}
    </div>
  )
}

function MunicipalityChecklist({
  loading,
  error,
  municipalities,
  claimedByKey,
  wholeSelected,
  selectedMunicipalityCodes,
  onToggleMunicipality,
}: {
  loading: boolean
  error: boolean
  municipalities: Municipality[]
  claimedByKey: Map<string, string>
  wholeSelected: boolean
  selectedMunicipalityCodes: Set<string>
  onToggleMunicipality: (municipality: Municipality, checked: boolean) => void
}) {
  if (loading) {
    return <p className="mt-2 pl-6 text-sm text-muted-foreground">{copy.loadingMunicipalities}</p>
  }

  if (error) {
    return <p className="mt-2 pl-6 text-sm text-destructive">{copy.municipalitiesLoadError}</p>
  }

  if (municipalities.length === 0) {
    return <p className="mt-2 pl-6 text-sm text-muted-foreground">{copy.noMunicipalitiesFound}</p>
  }

  return (
    <div className="mt-2 grid grid-cols-1 gap-1 pl-6 sm:grid-cols-2">
      {municipalities.map((municipality) => {
        const claimedBy = claimedByKey.get(
          destinationKey({ departmentCode: municipality.departmentCode, municipalityCode: municipality.code }),
        )
        const checked = wholeSelected || selectedMunicipalityCodes.has(municipality.code)
        const checkboxId = `municipality-${municipality.code}`
        const isLocked = wholeSelected || Boolean(claimedBy)
        const claimedDescriptionId = claimedBy ? `${checkboxId}-claimed` : undefined

        return (
          <div key={municipality.id} className="flex items-center gap-2">
            <Checkbox
              id={checkboxId}
              checked={checked}
              aria-disabled={isLocked ? true : undefined}
              aria-describedby={claimedDescriptionId}
              className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
              onCheckedChange={(value) => {
                if (isLocked) return
                onToggleMunicipality(municipality, value === true)
              }}
            />
            <Label
              htmlFor={checkboxId}
              className="min-w-0 flex-1 cursor-pointer text-sm max-md:flex max-md:min-h-11 max-md:items-center peer-aria-disabled:cursor-not-allowed peer-aria-disabled:opacity-70"
            >
              {municipality.name}
            </Label>
            {claimedBy ? <ClaimedByBadge id={claimedDescriptionId} zoneName={claimedBy} /> : null}
          </div>
        )
      })}
    </div>
  )
}

const MUNICIPALITY_SEARCH_DEBOUNCE_MS = 300

function MunicipalitySearchField({
  wholeDepartmentCodes,
  existingKeys,
  claimedByKey,
  onSelect,
}: {
  wholeDepartmentCodes: Set<string>
  existingKeys: Set<string>
  claimedByKey: Map<string, string>
  onSelect: (municipality: Municipality) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Municipality[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(false)

  const trimmedQuery = query.trim()
  const queryTooShort = trimmedQuery.length < MUNICIPALITY_SEARCH_MIN_LENGTH

  useEffect(() => {
    if (queryTooShort) return

    let active = true
    const timeoutId = setTimeout(() => {
      searchShippingMunicipalitiesAction(trimmedQuery)
        .then((municipalities) => {
          if (!active) return
          setResults(municipalities)
          setSearchError(false)
        })
        .catch((error) => {
          console.error("[Shipping Zones] Error al buscar municipios:", error)
          if (!active) return
          setResults([])
          setSearchError(true)
        })
        .finally(() => {
          if (active) setSearching(false)
        })
    }, MUNICIPALITY_SEARCH_DEBOUNCE_MS)

    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [trimmedQuery, queryTooShort])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (value.trim().length < MUNICIPALITY_SEARCH_MIN_LENGTH) {
      setResults([])
      setSearching(false)
    } else {
      setSearching(true)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {copy.municipalitySearchPlaceholder}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="editor-chrome w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={handleQueryChange} placeholder={copy.municipalitySearchPlaceholder} />
          <CommandList>
            {queryTooShort ? null : (
              <>
                <CommandEmpty>
                  {searching
                    ? copy.loadingMunicipalities
                    : searchError
                      ? copy.municipalitiesLoadError
                      : copy.noMunicipalitiesFound}
                </CommandEmpty>
                <CommandGroup>
                  {results.map((municipality) => {
                    const key = destinationKey({
                      departmentCode: municipality.departmentCode,
                      municipalityCode: municipality.code,
                    })
                    const claimedBy = claimedByKey.get(key)
                    const alreadySelected = wholeDepartmentCodes.has(municipality.departmentCode) || existingKeys.has(key)
                    const claimedDescriptionId = claimedBy ? `search-${municipality.code}-claimed` : undefined

                    return (
                      <CommandItem
                        key={municipality.id}
                        value={municipality.code}
                        disabled={alreadySelected || Boolean(claimedBy)}
                        aria-describedby={claimedDescriptionId}
                        onSelect={() => {
                          onSelect(municipality)
                          setOpen(false)
                          setQuery("")
                        }}
                      >
                        <Check className={alreadySelected ? "h-4 w-4 opacity-100" : "h-4 w-4 opacity-0"} />
                        <span className="flex-1">{`${municipality.name} (${municipality.departmentName})`}</span>
                        {claimedBy ? <ClaimedByBadge id={claimedDescriptionId} zoneName={claimedBy} /> : null}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
