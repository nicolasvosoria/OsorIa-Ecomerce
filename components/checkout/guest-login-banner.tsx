"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useCheckoutLoginIntent } from "@/contexts/checkout-login-intent-context"
import { useLanguage } from "@/contexts/language-context"

// Banner mostrado sobre el formulario de invitado (D2): la pregunta reutiliza
// t.auth.alreadyHaveAccount (mismo texto que ya usa el modal de login) y solo
// el CTA de login es copy propio de este banner.
export function GuestLoginBanner() {
  const { t } = useLanguage()
  const { requestLogin } = useCheckoutLoginIntent()

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-2 py-4">
        <p className="text-sm text-muted-foreground">{t.auth.alreadyHaveAccount}</p>
        <Button type="button" variant="link" className="h-auto p-0" onClick={requestLogin}>
          {t.checkout.guestLoginCta}
        </Button>
      </CardContent>
    </Card>
  )
}
