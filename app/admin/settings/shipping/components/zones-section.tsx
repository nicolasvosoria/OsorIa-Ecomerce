"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Info, Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { translations } from "@/lib/i18n/translations"
import {
  UNMATCHED_DESTINATION_ACTIONS,
  destinationKey,
  shippingRateBasisLabelKey,
  type ShippingMode,
  type UnmatchedDestinationAction,
} from "@/lib/shipping/schemas"
import type { ShippingZoneDestinationView, ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"
import { deleteShippingZoneAction, updateUnmatchedDestinationActionAction } from "../actions"

const copy = translations.es.shipping.zones

const VISIBLE_DESTINATION_BADGES = 3

export function ShippingZonesSection({
  mode,
  zones,
  unmatchedDestinationAction,
}: {
  mode: ShippingMode
  zones: ShippingZoneRecord[]
  unmatchedDestinationAction: UnmatchedDestinationAction
}) {
  if (mode === "coordinate") {
    return <CoordinateModeNotice />
  }

  return (
    <div className="space-y-6">
      <UnmatchedDestinationCard defaultValue={unmatchedDestinationAction} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle asChild className="text-base">
              <h2>{copy.sectionTitle}</h2>
            </CardTitle>
            <CardDescription>{copy.sectionDescription}</CardDescription>
          </div>
          <Button size="sm" className="shrink-0 gap-1.5" asChild>
            <Link href="/admin/settings/shipping/zones/new">
              <Plus className="h-4 w-4" /> {copy.addButton}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {zones.length === 0 ? (
            <div className="flex flex-col items-center gap-1 py-8 text-center">
              <p className="font-medium">{copy.emptyTitle}</p>
              <p className="text-sm text-muted-foreground">{copy.emptyDescription}</p>
            </div>
          ) : (
            <ZonesTable zones={zones} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CoordinateModeNotice() {
  return (
    <Alert>
      <Info aria-hidden />
      <AlertTitle>{copy.coordinateModeTitle}</AlertTitle>
      <AlertDescription>
        <p>
          {copy.coordinateModeDescription}{" "}
          <Link href="#shipping-mode" className="font-medium underline underline-offset-4">
            {copy.coordinateModeCta}
          </Link>
        </p>
      </AlertDescription>
    </Alert>
  )
}

function ZonesTable({ zones }: { zones: ShippingZoneRecord[] }) {
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
              <DestinationBadges destinations={zone.destinations} />
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{copy[shippingRateBasisLabelKey(zone.rateLadder.basis)]}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <Link href={`/admin/settings/shipping/zones/${zone.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" /> {copy.editTitle}
                  </Link>
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

function DestinationBadges({ destinations }: { destinations: ShippingZoneDestinationView[] }) {
  const visibleDestinations = destinations.slice(0, VISIBLE_DESTINATION_BADGES)
  const hiddenDestinationsCount = destinations.length - visibleDestinations.length

  return (
    <div className="flex flex-wrap gap-1">
      {visibleDestinations.map((destination) => (
        <Badge key={destinationKey(destination)} variant="outline">
          {destination.municipalityCode
            ? destination.municipalityName
            : `${copy.wholeDepartmentPrefix} ${destination.departmentName}`}
        </Badge>
      ))}
      {hiddenDestinationsCount > 0 && (
        <Badge variant="secondary">{copy.moreDestinationsLabel.replace("{count}", String(hiddenDestinationsCount))}</Badge>
      )}
    </div>
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
        <CardTitle asChild className="text-base">
          <h2>{copy.unmatchedDestinationTitle}</h2>
        </CardTitle>
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
