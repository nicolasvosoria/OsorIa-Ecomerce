"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useCart as useLocalCart, type CartItem } from "@/contexts/cart-context"
import { GuestCheckoutForm, GuestCustomerData } from "@/components/checkout/guest-checkout-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader } from "@/components/ui/loader"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { buildLocalCartSummary } from "@/lib/cart/cart-summary"
import { formatPrice } from "@/lib/commerce/utils"
import { useLanguage } from "@/contexts/language-context"
import { toast } from "sonner"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import {
  AuthenticatedCheckoutForm,
  type AuthenticatedCheckoutData,
} from "@/components/checkout/authenticated-checkout-form"
import { GuestLoginBanner } from "@/components/checkout/guest-login-banner"
import {
  getCheckoutPrefill,
  getCheckoutStoreContactPhone,
  placeCheckoutOrder,
  type CheckoutPrefill,
} from "@/app/checkout/actions"
import { useStore } from "@/contexts/store-context"
import { enabledPaymentMethodIds } from "@/lib/checkout/payment-methods"
import type { CheckoutOrderInput } from "@/lib/checkout/schemas"
import type { Translations } from "@/lib/i18n/translations"
import type { ShippingDestination } from "@/lib/shipping/schemas"
import { shippingStatusLabelKeyForBuyer } from "@/lib/shipping/status-label"
import { buildWhatsAppLink } from "@/lib/stores/whatsapp-contact"
import { useShippingQuote, type ShippingQuoteState } from "@/app/checkout/use-shipping-quote"

export default function CheckoutPage() {
  const router = useRouter()
  const localCart = useLocalCart()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const { t } = useLanguage()
  const { store } = useStore()
  const [customerData, setCustomerData] = useState<GuestCustomerData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [prefill, setPrefill] = useState<CheckoutPrefill>(null)
  const [contactPhone, setContactPhone] = useState<string | null>(null)
  const [destination, setDestination] = useState<ShippingDestination | null>(null)

  // Identity stays stable across renders (empty deps): the two checkout
  // forms call this from an effect keyed on their own watched fields, and a
  // fresh function reference every render would refire that effect forever.
  // The functional update bails out to the SAME state object when the
  // destination didn't actually change, so picking the same municipality
  // twice never triggers a re-quote.
  const handleDestinationChange = useCallback((next: ShippingDestination | null) => {
    setDestination((previous) => {
      if (previous?.departmentCode === next?.departmentCode && previous?.municipalityCode === next?.municipalityCode) {
        return previous
      }
      return next
    })
  }, [])

  // Limpiar datos previos del checkout al cargar la página
  // Esto asegura que siempre se muestre el formulario para una nueva compra
  useEffect(() => {
    // Limpiar cualquier dato de cliente guardado previamente
    // Esto es importante porque después de completar una compra y volver,
    // no queremos mostrar datos de la compra anterior
    localStorage.removeItem("guest_customer_data")
  }, [])

  // El formulario nunca espera esto para renderizarse (D4): se pide en cuanto
  // hay sesión y los valores llegan al formulario cuando resuelva la promesa.
  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false
    getCheckoutPrefill().then((result) => {
      if (!cancelled) setPrefill(result)
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  // D14/D11: names who the customer is coordinating the shipment with. No
  // phone on file just means whatsappHref stays null and the coordination
  // note below never renders -- same "absent, not a fallback" rule as
  // components/ui/floating-contact-button.tsx.
  useEffect(() => {
    let cancelled = false
    getCheckoutStoreContactPhone().then((phone) => {
      if (!cancelled) setContactPhone(phone)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const hasLocalItems = localCart.items.length > 0
  const cartSubtotal = localCart.getTotal()
  const {
    quote: shippingQuote,
    fingerprint: quoteRequestFingerprint,
    retry: retryShippingQuote,
  } = useShippingQuote(destination, localCart.items, cartSubtotal)
  const isShippingBlocked = shippingQuote.kind === "blocked"

  const localSummary = buildLocalCartSummary({
    items: localCart.items,
    getItemSubtotal: localCart.getItemSubtotal,
    total: cartSubtotal,
    shippingAmount: shippingQuote.kind === "resolved" ? shippingQuote.amount : 0,
  })
  const whatsappHref = contactPhone ? buildWhatsAppLink(contactPhone) : null
  // D28/D25: one id per checkout ATTEMPT (Stripe's model). quoteRequestFingerprint
  // is exactly "the destination or the cart", the only two things that alter
  // the price -- reusing it as the trigger means this regenerates in lockstep
  // with the quote above instead of drifting from a second copy of the same
  // rule. Retries of the same content (nothing changed, "try again" after a
  // failed submit) keep the SAME key on purpose: crypto.randomUUID() never
  // runs again unless the fingerprint itself changed, or
  // ecommerce.create_order_with_notifications rejects the reuse as a
  // conflict (the exact bug D25 exists to prevent). A page reload always
  // mints a new one regardless (fresh mount, fresh useMemo) -- that's a
  // different attempt.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const checkoutIdempotencyKey = useMemo(() => crypto.randomUUID(), [quoteRequestFingerprint])

  useEffect(() => {
    // Redirigir si el carrito está vacío, solo una vez hidratado desde localStorage
    if (localCart.hasHydrated && !hasLocalItems) {
      toast.error("Tu carrito está vacío")
      router.push("/shop")
    }
  }, [localCart.hasHydrated, hasLocalItems, router])

  // Para usuarios autenticados, intentar procesar directamente
  // Si faltan datos (dirección/teléfono), mostrar formulario simplificado
  // Para usuarios invitados, mostrar formulario completo

  // Función para procesar checkout de usuario autenticado
  const handleAuthenticatedCheckoutComplete = async (data: AuthenticatedCheckoutData) => {
    if (!user || !hasLocalItems) return

    setIsProcessing(true)

    try {
      // El nombre lo captura el formulario (el perfil puede no traerlo); el
      // correo sigue viniendo de la cuenta porque es de solo lectura. D24: el
      // destino (departamento/municipio) lo captura el mismo picker que usa
      // el invitado -- ya no se fuerza a vacío.
      const customerDataForOrder: GuestCustomerData = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: user.email || "",
        phone: data.phone,
        address: data.address,
        departmentCode: data.departmentCode,
        departmentName: data.departmentName,
        city: data.city,
        municipalityCode: data.municipalityCode,
        locationId: data.locationId,
        postalCode: data.postalCode,
        country: data.country,
        notes: "",
        paymentMethod: data.paymentMethod,
      }

      // Crear el pedido con datos del usuario autenticado; la sesión del
      // servidor decide user_id/customer_type, no este componente
      await processOrder(customerDataForOrder)
    } catch (error: any) {
      console.error("Error procesando checkout autenticado:", error)

      // Si el error ya tiene un mensaje específico de stock, el mensaje ya fue
      // mostrado en processOrder: no mostrar uno genérico adicional
      if (!error.message?.includes("stock")) {
        toast.error(error.message || "Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.")
      }

      setIsProcessing(false)
    }
  }

  // Función compartida para procesar el pedido
  const processOrder = async (data: GuestCustomerData) => {
    if (!hasLocalItems) {
      throw new Error("El carrito está vacío")
    }

    // Preparar los items del pedido desde el carrito local
    const orderItems = await buildOrderItemsFromCart(localCart.items, localCart.getItemSubtotal)
    // Crear el pedido. La identidad (sesión), el estado de pago y los totales
    // los fuerza la server action; el cliente solo envía sus datos y el carrito.
    let order
    try {
      const orderPayload: CheckoutOrderInput = {
        customer_email: data.email,
        customer_first_name: data.firstName,
        customer_last_name: data.lastName,
        customer_phone: data.phone || undefined,
        shipping_address: data.address,
        shipping_department_code: data.departmentCode || "",
        shipping_department_name: data.departmentName || "",
        shipping_city: data.city || "",
        shipping_municipality_code: data.municipalityCode || "",
        shipping_location_id: data.locationId || "",
        shipping_postal_code: data.postalCode || "",
        shipping_country: data.country,
        shipping_notes: data.notes || undefined,
        payment_method: data.paymentMethod || enabledPaymentMethodIds()[0],
        items: orderItems,
      }

      const result = await placeCheckoutOrder(orderPayload, checkoutIdempotencyKey)
      if (!result.success) {
        const error = new Error(result.error || "No se pudo crear el pedido")
        if (result.validationResult) {
          ;(error as any).validationResult = result.validationResult
        }
        throw error
      }

      order = result
    } catch (error: any) {
      // Manejar errores de validación de stock
      if (error.message && error.message.includes("No hay suficiente stock disponible")) {
        // Obtener información detallada del error
        const validationResult = (error as any).validationResult
        
        if (validationResult && validationResult.errors) {
          // Mostrar notificaciones individuales para cada producto con problemas
          validationResult.errors.forEach((err: any) => {
            toast.error(err.message, {
              duration: 5000,
            })
          })
        } else {
          // Si no hay información detallada, mostrar el mensaje genérico
          toast.error(error.message, {
            duration: 5000,
          })
        }
        
        // Lanzar el error para que se maneje en el catch del componente
        throw new Error("Algunos productos no tienen suficiente stock disponible. Por favor, revisa tu carrito y actualiza las cantidades.")
      }
      
      // Re-lanzar otros errores
      throw error
    }

    // Guardar el número de pedido en localStorage
    localStorage.setItem("last_order_number", order.orderNumber)
    localStorage.setItem("last_order_id", order.orderId)

    toast.success(`Pedido creado: ${order.orderNumber}`)

    // Redirigir a la página de éxito
    router.push(
      `/checkout/success?order=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(data.email)}`,
    )
  }

  const handleGuestCheckoutComplete = async (data: GuestCustomerData) => {
    setIsProcessing(true)
    setCustomerData(data)

    try {
      // Guardar datos del cliente en localStorage para uso posterior
      localStorage.setItem("guest_customer_data", JSON.stringify(data))

      // Procesar el pedido
      await processOrder(data)
    } catch (error: any) {
      console.error("Error procesando checkout:", error)

      // Si el error ya tiene un mensaje específico de stock, el mensaje ya fue
      // mostrado en processOrder: no mostrar uno genérico adicional
      if (!error.message?.includes("stock")) {
        toast.error(error.message || "Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.")
      }

      // Limpiar el estado si hay un error para que se muestre el formulario nuevamente
      setIsProcessing(false)
      setCustomerData(null)
      localStorage.removeItem("guest_customer_data")
    }
  }

  // Mostrar loading solo mientras se carga la autenticación o el carrito
  if (authLoading || !localCart.hasHydrated) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">
              {authLoading ? "Verificando sesión..." : "Cargando carrito..."}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Si el carrito está vacío, no mostrar nada (el useEffect redirigirá)
  if (!hasLocalItems) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Redirigiendo...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si está autenticado y está procesando, mostrar mensaje de procesamiento
  if (isAuthenticated && isProcessing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Procesando tu pedido...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a la tienda
          </Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Finalizar Compra</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Completa tus datos para procesar tu pedido
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de Checkout */}
        <div className="lg:col-span-2">
          {!customerData && !isProcessing ? (
            isAuthenticated && user ? (
              <AuthenticatedCheckoutForm
                user={user}
                onComplete={handleAuthenticatedCheckoutComplete}
                isLoading={isProcessing}
                prefill={prefill}
                onDestinationChange={handleDestinationChange}
                shippingBlocked={isShippingBlocked}
              />
            ) : (
              <div className="space-y-6">
                <GuestLoginBanner />
                <GuestCheckoutForm
                  onComplete={handleGuestCheckoutComplete}
                  isLoading={isProcessing}
                  onDestinationChange={handleDestinationChange}
                  shippingBlocked={isShippingBlocked}
                />
              </div>
            )
          ) : customerData && isProcessing ? (
            <Card>
              <CardHeader>
                <CardTitle>Procesando tu pedido...</CardTitle>
                <CardDescription>
                  Por favor espera mientras procesamos tu información
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-semibold mb-2">Datos del Cliente:</p>
                    <p className="text-sm">
                      {customerData.firstName} {customerData.lastName}
                    </p>
                    <p className="text-sm">{customerData.email}</p>
                    <p className="text-sm">{customerData.phone}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-semibold mb-2">Dirección de Envío:</p>
                    <p className="text-sm">
                      {customerData.address}, {customerData.city}
                    </p>
                    <p className="text-sm">
                      {customerData.postalCode}, {customerData.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Resumen del Pedido */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-4">
            <CardHeader>
              <CardTitle>{t.checkout.orderSummary}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {localCart.items.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start pb-3 border-b"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.cart.quantityLabel}: {item.quantity}
                      </p>
                      {item.itemKind === "combo" && item.comboDetails && (
                        <ul className="mt-1 text-[11px] text-muted-foreground">
                          {item.comboDetails.components.map((component) => (
                            <li key={`${component.productId}-${component.variantId || "base"}`}>
                              {component.quantity}× {component.productName}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <p className="text-sm font-semibold ml-4">
                      {localSummary.lines[index]?.formattedLineTotal}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.cart.subtotal}</span>
                  <span>{localSummary.formattedSubtotal}</span>
                </div>
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{t.cart.shipping}</span>
                  <span className="text-right text-muted-foreground">
                    {renderShippingQuoteValue(shippingQuote, t, localSummary.currencyCode)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>{t.cart.total}</span>
                  <span>
                    {shippingQuote.kind === "resolved" ? localSummary.formattedTotal : t.checkout.totalPendingShipping}
                  </span>
                </div>
                {renderShippingQuoteIssue(shippingQuote, t, retryShippingQuote)}
              </div>

              {needsShippingCoordinationNote(shippingQuote) && whatsappHref && store?.store_name && (
                <div className="pt-2 text-xs text-muted-foreground">
                  <p>
                    {t.checkout.shippingCoordinationContact.replace("{storeName}", store.store_name)}{" "}
                    <Link
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-4"
                    >
                      {t.checkout.shippingCoordinationCta}
                    </Link>
                  </p>
                </div>
              )}

              <div className="pt-4 text-xs text-muted-foreground">
                <p>
                  Al continuar, aceptas nuestros términos y condiciones de
                  compra.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Combos se repriceean contra su snapshot (buildComboOrderSnapshotById);
// productos normales usan getItemSubtotal para derivar su unit_price.
async function buildOrderItemsFromCart(
  items: CartItem[],
  getItemSubtotal: (item: CartItem) => number,
): Promise<CheckoutOrderInput["items"]> {
  return Promise.all(
    items.map(async (item) => {
      if (item.itemKind === "combo" && item.comboId) {
        const { buildComboOrderSnapshotById } = await import("@/lib/supabase/combos-api")
        const snapshot = await buildComboOrderSnapshotById(item.comboId, item.quantity)
        if (!snapshot || !snapshot.availability.isAvailable) {
          throw new Error(`No hay suficiente stock disponible para el combo ${item.name}`)
        }

        return {
          product_id: undefined,
          product_name: item.name,
          product_sku: undefined,
          variant_id: undefined,
          variant_title: "Combo",
          unit_price: snapshot.chargedUnitPrice,
          quantity: item.quantity,
          total_price: snapshot.chargedLineTotal,
          currency_code: snapshot.pricing.currencyCode,
          product_image_url: item.image || undefined,
          product_slug: item.productSlug,
          selected_options: {},
          metadata: {
            item_kind: "combo",
            combo_id: item.comboId,
            combo_snapshot: snapshot,
          },
        }
      }

      const itemSubtotal = getItemSubtotal(item)
      const unitPrice = item.quantity > 0 ? itemSubtotal / item.quantity : 0
      return {
        product_id: item.productId || (typeof item.id === "string" ? item.id : undefined),
        product_name: item.name,
        product_sku: undefined,
        variant_id: item.variantId,
        variant_title: undefined,
        unit_price: unitPrice,
        quantity: item.quantity,
        total_price: itemSubtotal,
        currency_code: item.currencyCode || "COP",
        product_image_url: item.image || undefined,
        product_slug: item.productSlug,
        selected_options: {},
      }
    }),
  )
}

function needsShippingCoordinationNote(quote: ShippingQuoteState): boolean {
  if (quote.kind === "blocked") return true
  return quote.kind === "resolved" && shippingStatusLabelKeyForBuyer(quote.status) === "agreed"
}

// The price column: a blocked or failed quote is a hard stop, not a value,
// so it renders the same "—" the rest of the app uses for an absent value
// (see e.g. app/orders/[orderNumber]/order-detail-client.tsx) -- the actual
// sentence explaining why lives in renderShippingQuoteIssue below, as its
// own full-width block, not squeezed into this value slot.
function renderShippingQuoteValue(quote: ShippingQuoteState, t: Translations, currencyCode: string) {
  if (quote.kind === "idle") return t.checkout.shippingSelectDestination
  if (quote.kind === "blocked" || quote.kind === "failed") return "—"
  if (quote.kind === "loading") {
    return (
      <span className="inline-flex items-center gap-2">
        <Loader size="sm" />
        {t.checkout.shippingCalculating}
      </span>
    )
  }

  // A15: buyer-facing audience-scoped mapping -- lib/shipping/status-label.ts.
  const labelKey = shippingStatusLabelKeyForBuyer(quote.status)
  return labelKey ? t.orders.shippingStatusLabels.buyer[labelKey] : formatPrice(quote.amount, currencyCode)
}

// The full-width sentence a blocked or failed quote earns below the totals:
// blocked is destructive (a hard stop -- D7's "antes de continuar con la
// compra"), failed stays normal foreground and carries its own retry, since
// re-picking the SAME municipality can't re-fire the quote on its own
// (handleDestinationChange's identity check above).
function renderShippingQuoteIssue(quote: ShippingQuoteState, t: Translations, retry: () => void) {
  if (quote.kind === "blocked") {
    return <p className="text-sm text-destructive">{t.checkout.shippingBlocked}</p>
  }
  if (quote.kind !== "failed") return null

  return (
    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <p className="text-sm text-foreground">{t.checkout.shippingQuoteFailed}</p>
      <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={retry}>
        {t.common.retry}
      </Button>
    </div>
  )
}
