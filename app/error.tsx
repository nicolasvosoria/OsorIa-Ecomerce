"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"
import { useEffect } from "react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useLanguage()

  useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="mx-auto mb-4 mt-20 flex max-w-xl flex-col rounded-lg border border-border bg-card p-8 md:p-12">
      <h2 className="text-xl font-bold">{t.errorPage.heading}</h2>
      <p className="my-2">{t.errorPage.description}</p>
      {error.message && (
        <p className="text-sm text-muted-foreground mt-2">
          {t.errorPage.errorLabel} {error.message}
        </p>
      )}
      <Button size="lg" className="mt-4" onClick={() => reset()}>
        {t.errorPage.tryAgain}
      </Button>
    </div>
  )
}
