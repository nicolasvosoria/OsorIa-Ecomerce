"use client"

import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CuentaConfirmadaPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
        <div className="mb-6 flex justify-center">
          <CheckCircle2 className="h-16 w-16 text-green-600" aria-hidden />
        </div>
        <h1 className="mb-3 text-xl font-semibold text-foreground">
          Tu cuenta ha sido registrada exitosamente
        </h1>
        <p className="mb-6 text-muted-foreground">
          Dale click aquí para continuar a la tienda.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/">Continuar a la tienda</Link>
        </Button>
      </div>
    </div>
  )
}
