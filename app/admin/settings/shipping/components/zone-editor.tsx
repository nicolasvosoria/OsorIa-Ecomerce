"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useFieldArray, useForm, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown, Loader2, Pencil, Plus, Save, X } from "lucide-react"
import { toast } from "sonner"

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field-error"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { translations } from "@/lib/i18n/translations"
import type { Department, Municipality } from "@/lib/shipping/locations-api"
import {
  UNMATCHED_DESTINATION_ACTIONS,
  findShippingLadderGaps,
  shippingRateBasisLabelKey,
  shippingRateLadderSchema,
  shippingZoneFormSchema,
  toRateLadderPayload,
  type ShippingRateLadder,
  type UnmatchedDestinationAction,
  type ZoneEditorFormValues,
} from "@/lib/shipping/schemas"
import type { MissingWeightProduct, ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"
import {
  deleteShippingZoneAction,
  listShippingDepartmentsAction,
  listShippingMunicipalitiesAction,
  saveShippingZoneAction,
  updateUnmatchedDestinationActionAction,
} from "../actions"
import { EMPTY_RANGE_ROW, RateLadderField } from "./rate-ladder-field"

const copy = translations.es.shipping.zones

export function ShippingZonesSection({
  zones,
  missingWeightProducts,
  unmatchedDestinationAction,
}: {
  zones: ShippingZoneRecord[]
  missingWeightProducts: MissingWeightProduct[]
  unmatchedDestinationAction: UnmatchedDestinationAction
}) {
  const [editingZoneId, setEditingZoneId] = useState<string | "new" | null>(null)
  const [departments, setDepartments] = useState<Department[]>([])

  useEffect(() => {
    listShippingDepartmentsAction()
      .then(setDepartments)
      .catch((error) => console.error("[Shipping Zones] Error al cargar departamentos:", error))
  }, [])

  const editingZone = editingZoneId && editingZoneId !== "new" ? zones.find((zone) => zone.id === editingZoneId) ?? null : null

  return (
    <div className="space-y-6">
      <UnmatchedDestinationCard defaultValue={unmatchedDestinationAction} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{copy.sectionTitle}</CardTitle>
            <CardDescription>{copy.sectionDescription}</CardDescription>
          </div>
          <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={() => setEditingZoneId("new")}>
            <Plus className="h-4 w-4" /> {copy.addButton}
          </Button>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{copy.emptyDescription}</p>
          ) : (
            <ZonesTable zones={zones} onEdit={setEditingZoneId} />
          )}
        </CardContent>
      </Card>

      <Dialog open={editingZoneId !== null} onOpenChange={(open) => !open && setEditingZoneId(null)}>
        <DialogContent className="editor-chrome max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingZoneId === "new" ? copy.createTitle : copy.editTitle}</DialogTitle>
            <DialogDescription>{copy.sectionDescription}</DialogDescription>
          </DialogHeader>
          {editingZoneId !== null ? (
            <ZoneForm
              key={editingZoneId}
              zone={editingZone}
              departments={departments}
              missingWeightProducts={missingWeightProducts}
              onClose={() => setEditingZoneId(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ZonesTable({
  zones,
  onEdit,
}: {
  zones: ShippingZoneRecord[]
  onEdit: (zoneId: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{copy.nameLabel}</TableHead>
          <TableHead>{copy.destinationsColumn}</TableHead>
          <TableHead>{copy.basisColumn}</TableHead>
          <TableHead className="text-right">{copy.actionsColumn}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {zones.map((zone) => (
          <TableRow key={zone.id}>
            <TableCell className="font-medium">{zone.name}</TableCell>
            <TableCell className="whitespace-normal">
              <div className="flex flex-wrap gap-1">
                {zone.destinations.map((destination) => (
                  <Badge key={`${destination.departmentCode}:${destination.municipalityCode ?? ""}`} variant="outline">
                    {destination.municipalityCode
                      ? destination.municipalityName
                      : `${copy.wholeDepartmentPrefix} ${destination.departmentName}`}
                  </Badge>
                ))}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{copy[shippingRateBasisLabelKey(zone.rateLadder.basis)]}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="outline" size="sm" onClick={() => onEdit(zone.id)} className="gap-1.5">
                  <Pencil className="h-3.5 w-3.5" /> {copy.editTitle}
                </Button>
                <DeleteZoneButton zoneId={zone.id} zoneName={zone.name} />
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function DeleteZoneButton({ zoneId, zoneName }: { zoneId: string; zoneName: string }) {
  const router = useRouter()

  return (
    <ConfirmActionButton
      onConfirm={async () => {
        const result = await deleteShippingZoneAction(zoneId)
        if (result.success) router.refresh()
        return result
      }}
      icon={X}
      triggerAriaLabel={`${copy.deleteConfirmButton} ${zoneName}`}
      title={copy.deleteTitle}
      description={copy.deleteDescription}
      confirmLabel={copy.deleteConfirmButton}
      successMessage={copy.deletedToast}
      errorFallbackMessage={copy.deleteErrorToast}
    />
  )
}

function UnmatchedDestinationCard({ defaultValue }: { defaultValue: UnmatchedDestinationAction }) {
  const [isSaving, setIsSaving] = useState(false)

  async function handleChange(value: UnmatchedDestinationAction) {
    setIsSaving(true)
    const result = await updateUnmatchedDestinationActionAction({ unmatchedDestinationAction: value })
    setIsSaving(false)
    if (result.success) {
      toast.success(copy.unmatchedDestinationSavedToast)
    } else {
      toast.error(result.error || copy.unmatchedDestinationSaveErrorToast)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{copy.unmatchedDestinationTitle}</CardTitle>
        <CardDescription>{copy.unmatchedDestinationDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Select defaultValue={defaultValue} onValueChange={(value) => handleChange(value as UnmatchedDestinationAction)} disabled={isSaving}>
          <SelectTrigger className="w-full sm:w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="editor-chrome">
            {UNMATCHED_DESTINATION_ACTIONS.map((action) => (
              <SelectItem key={action} value={action}>
                {action === "block" ? copy.unmatchedDestinationBlock : copy.unmatchedDestinationAllow}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}

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

function ZoneForm({
  zone,
  departments,
  missingWeightProducts,
  onClose,
}: {
  zone: ShippingZoneRecord | null
  departments: Department[]
  missingWeightProducts: MissingWeightProduct[]
  onClose: () => void
}) {
  const router = useRouter()
  const nameHints = useMemo(() => buildNameHints(zone), [zone])

  const {
    control,
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ZoneEditorFormValues>({
    resolver: zodResolver(shippingZoneFormSchema),
    defaultValues: toDefaultValues(zone),
  })

  async function onSubmit() {
    const ladderPayload = toRateLadderPayload(getValues("rateLadder"))
    const parsedLadder = shippingRateLadderSchema.safeParse(ladderPayload)
    if (!parsedLadder.success) {
      toast.error(copy.saveErrorToast)
      return
    }

    const gapIssues = findShippingLadderGaps(parsedLadder.data)
    if (gapIssues.length > 0) {
      toast.error(gapIssues[0].message)
      return
    }

    const { name, destinations } = getValues()
    const result = await saveShippingZoneAction({ name, destinations, rateLadder: parsedLadder.data }, zone?.id)

    if (!result.success) {
      toast.error(result.error || copy.saveErrorToast)
      return
    }

    toast.success(copy.savedToast)
    router.refresh()
    onClose()
  }

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-4">
      <FormField id="zone-name" label={copy.nameLabel} error={errors.name?.message}>
        {(field) => <Input {...field} placeholder={copy.namePlaceholder} {...register("name")} />}
      </FormField>

      <DestinationsField control={control} departments={departments} nameHints={nameHints} />
      <FieldError message={errors.destinations?.message} />

      <RateLadderField control={control} missingWeightProducts={missingWeightProducts} />

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          {copy.cancelButton}
        </Button>
        <Button type="submit" disabled={isSubmitting} className="gap-2">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isSubmitting ? copy.saving : copy.saveButton}
        </Button>
      </div>
    </form>
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

  const existingKeys = new Set(
    fields.map((field) => `${field.departmentCode}:${field.municipalityCode ?? ""}`),
  )

  function addWholeDepartment() {
    if (!selectedDepartment || existingKeys.has(`${selectedDepartment}:`)) return
    append({ departmentCode: selectedDepartment, municipalityCode: null })
  }

  function addMunicipality(municipality: Municipality) {
    if (existingKeys.has(`${municipality.departmentCode}:${municipality.code}`)) return

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
                    const alreadyAdded = existingKeys.has(`${municipality.departmentCode}:${municipality.code}`)
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
