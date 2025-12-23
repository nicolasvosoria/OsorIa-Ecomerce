"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ShoppingBag, Home } from "lucide-react"
import Link from "next/link"
import { GuestCustomerData } from "@/components/checkout/guest-checkout-form"

function CheckoutSuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [customerData, setCustomerData] = useState<GuestCustomerData | null>(null)
  const [orderNumber, setOrderNumber] = useState<string | null>(null)

  useEffect(() => {
    // Obtener número de pedido desde URL o localStorage
    const orderFromUrl = searchParams.get("order")
    const orderFromStorage = localStorage.getItem("last_order_number")
    setOrderNumber(orderFromUrl || orderFromStorage)

    // Obtener datos del cliente desde localStorage
    const savedData = localStorage.getItem("guest_customer_data")
    if (savedData) {
      try {
        setCustomerData(JSON.parse(savedData))
      } catch (error) {
        console.error("Error parsing customer data:", error)
      }
    }
  }, [searchParams])

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Card className="text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900 p-4">
              <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <CardTitle className="text-3xl">¡Pedido Recibido!</CardTitle>
          <CardDescription className="text-lg">
            Gracias por tu compra. Hemos recibido tu pedido y te contactaremos pronto.
          </CardDescription>
          {orderNumber && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Número de Pedido</p>
              <p className="text-2xl font-bold">{orderNumber}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Guarda este número para consultar el estado de tu pedido
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {customerData && (
            <div className="text-left space-y-4 p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-semibold mb-2">Datos de Contacto:</h3>
                <p className="text-sm">
                  <strong>Nombre:</strong> {customerData.firstName}{" "}
                  {customerData.lastName}
                </p>
                <p className="text-sm">
                  <strong>Email:</strong> {customerData.email}
                </p>
                <p className="text-sm">
                  <strong>Teléfono:</strong> {customerData.phone}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Dirección de Envío:</h3>
                <p className="text-sm">
                  {customerData.address}, {customerData.city}
                </p>
                <p className="text-sm">
                  {customerData.postalCode}, {customerData.country}
                </p>
              </div>
              {customerData.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notas:</h3>
                  <p className="text-sm">{customerData.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-muted-foreground">
              Te enviaremos un correo de confirmación a{" "}
              {customerData?.email || "tu correo"} con los detalles de tu pedido.
            </p>
            <p className="text-muted-foreground">
              Si tienes alguna pregunta, no dudes en contactarnos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/shop">
              <Button variant="outline" className="w-full sm:w-auto">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Seguir Comprando
              </Button>
            </Link>
            <Link href="/">
              <Button className="w-full sm:w-auto">
                <Home className="w-4 h-4 mr-2" />
                Ir al Inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 max-w-2xl">
          <Card className="text-center">
            <CardHeader>
              <div className="flex justify-center">
                <div className="rounded-full bg-muted p-4 animate-pulse">
                  <CheckCircle2 className="w-16 h-16 text-muted-foreground" />
                </div>
              </div>
              <CardTitle className="text-3xl">Cargando...</CardTitle>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  )
}

