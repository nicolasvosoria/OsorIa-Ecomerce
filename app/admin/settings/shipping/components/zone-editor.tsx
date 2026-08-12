"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Pencil, Plus, X } from "lucide-react"
import { toast } from "sonner"

import { ConfirmActionButton } from "@/components/admin/confirm-action-button"
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
  type UnmatchedDestinationAction,
} from "@/lib/shipping/schemas"
import type { ShippingZoneRecord } from "@/lib/supabase/shipping-zones-api"
import { deleteShippingZoneAction, updateUnmatchedDestinationActionAction } from "../actions"

const copy = translations.es.shipping.zones

export function ShippingZonesSection({
  zones,
  unmatchedDestinationAction,
}: {
  zones: ShippingZoneRecord[]
  unmatchedDestinationAction: UnmatchedDestinationAction
}) {
  return (
    <div className="space-y-6">
      <UnmatchedDestinationCard defaultValue={unmatchedDestinationAction} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">{copy.sectionTitle}</CardTitle>
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
            <p className="py-8 text-center text-sm text-muted-foreground">{copy.emptyDescription}</p>
          ) : (
            <ZonesTable zones={zones} />
          )}
        </CardContent>
      </Card>
    </div>
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
              <div className="flex flex-wrap gap-1">
                {zone.destinations.map((destination) => (
                  <Badge key={destinationKey(destination)} variant="outline">
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
