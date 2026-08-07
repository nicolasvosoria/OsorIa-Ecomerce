import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { translations } from "@/lib/i18n/translations"
import { shippingModeLabelKey, type ShippingMode } from "@/lib/shipping/schemas"

const copy = translations.es.shipping

// D13: a short summary that links out to the dedicated /admin/settings/shipping
// screen -- the same pattern /admin/products uses for its subroutes, so the
// zones-and-rates query a later slice adds never has to ride in this page.
export function ShippingSummaryPanel({ mode }: { mode: ShippingMode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{copy.summaryTitle}</CardTitle>
        <CardDescription>
          {copy.summaryModeLabel}: {copy[shippingModeLabelKey(mode)]}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/admin/settings/shipping">
            {copy.summaryConfigureLink}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
