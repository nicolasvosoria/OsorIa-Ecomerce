"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart as useShopifyCart } from "@/components/cart/cart-context"
import { useCart as useLocalCart } from "@/contexts/cart-context"
import { GuestCheckoutForm, GuestCustomerData } from "@/components/checkout/guest-checkout-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { formatPrice } from "@/lib/shopify/utils"
import { toast } from "sonner"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { AuthenticatedCheckoutForm } from "@/components/checkout/authenticated-checkout-form"

export default function CheckoutPage() {
  const router = useRouter()
  const shopifyCart = useShopifyCart()
  const localCart = useLocalCart()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const [customerData, setCustomerData] = useState<GuestCustomerData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Limpiar datos previos del checkout al cargar la página
  // Esto asegura que siempre se muestre el formulario para una nueva compra
  useEffect(() => {
    // Limpiar cualquier dato de cliente guardado previamente
    // Esto es importante porque después de completar una compra y volver,
    // no queremos mostrar datos de la compra anterior
    localStorage.removeItem("guest_customer_data")
    setCustomerData(null)
    setIsProcessing(false)
  }, [])

  // Determinar qué carrito usar (preferir Shopify, luego local)
  const cart = shopifyCart.cart
  const isPending = shopifyCart.isPending
  const hasShopifyItems = cart && cart.lines.length > 0
  const hasLocalItems = localCart.items.length > 0
  const hasAnyItems = hasShopifyItems || hasLocalItems

  useEffect(() => {
    // Redirigir si ambos carritos están vacíos (solo después de que se haya cargado)
    if (!isPending && cart !== undefined && !hasAnyItems) {
      toast.error("Tu carrito está vacío")
      router.push("/shop")
    }
  }, [cart, isPending, hasAnyItems, router])

  // Para usuarios autenticados, intentar procesar directamente
  // Si faltan datos (dirección/teléfono), mostrar formulario simplificado
  // Para usuarios invitados, mostrar formulario completo

  // Función para procesar checkout de usuario autenticado
  const handleAuthenticatedCheckoutComplete = async (data: { phone: string; address: string }) => {
    if (!user || !hasAnyItems) return

    setIsProcessing(true)

    try {
      // Preparar datos del cliente desde el perfil del usuario
      const customerDataForOrder: GuestCustomerData = {
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
        phone: data.phone,
        address: data.address,
        city: "",
        postalCode: "",
        country: "Colombia",
        notes: "",
      }

      // Crear el pedido con datos del usuario autenticado
      await processOrder(customerDataForOrder, user.id)
    } catch (error) {
      console.error("Error procesando checkout autenticado:", error)
      toast.error("Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.")
      setIsProcessing(false)
    }
  }

  // Función compartida para procesar el pedido
  const processOrder = async (data: GuestCustomerData, userId?: string | null) => {
    if (!hasAnyItems) {
      throw new Error("El carrito está vacío")
    }

    const { createOrder } = await import("@/lib/supabase/orders-api")
    
    // Preparar los items del pedido según el tipo de carrito
    let orderItems: any[] = []
    let subtotal = 0
    let total = 0
    let currencyCode = "COP"

    if (hasShopifyItems && cart) {
      // Procesar items del carrito de Shopify
      orderItems = cart.lines.map((line) => {
      const product = line.merchandise.product
      // Obtener la primera imagen disponible
      const firstImage = product.images && product.images.length > 0 
        ? product.images[0] 
        : product.featuredImage
      
      // El product.id puede ser el título en algunos casos, así que lo tratamos como opcional
      const productId = product.id && product.id !== product.title ? product.id : undefined
      
      return {
        product_id: productId,
        product_name: product.title,
        product_sku: undefined, // Se puede obtener del producto si está disponible
        variant_id: line.merchandise.id || undefined,
        variant_title: line.merchandise.title || undefined,
        unit_price: parseFloat(line.cost.totalAmount.amount) / line.quantity,
        quantity: line.quantity,
        total_price: parseFloat(line.cost.totalAmount.amount),
        currency_code: line.cost.totalAmount.currencyCode,
        product_image_url: firstImage?.url || undefined,
        product_slug: product.handle || undefined,
        selected_options: Array.isArray(line.merchandise.selectedOptions) 
          ? line.merchandise.selectedOptions.reduce((acc: Record<string, string>, opt: { name: string; value: string }) => {
              acc[opt.name] = opt.value
              return acc
            }, {})
          : {},
      }
      })
      subtotal = parseFloat(cart.cost.subtotalAmount.amount)
      total = parseFloat(cart.cost.totalAmount.amount)
      currencyCode = cart.cost.totalAmount.currencyCode
    } else if (hasLocalItems) {
      // Procesar items del carrito local
      orderItems = localCart.items.map((item) => {
        const priceNum = parseFloat((item.salePrice || item.price).replace(/[$,]/g, "")) || 0
        return {
          product_id: typeof item.id === "string" ? item.id : undefined,
          product_name: item.name,
          product_sku: undefined,
          variant_id: undefined,
          variant_title: undefined,
          unit_price: priceNum,
          quantity: item.quantity,
          total_price: priceNum * item.quantity,
          currency_code: "COP",
          product_image_url: item.image || undefined,
          product_slug: undefined,
          selected_options: {},
        }
      })
      subtotal = localCart.getTotal()
      total = localCart.getTotal()
      currencyCode = "COP"
    }

    // Crear el pedido
    const order = await createOrder({
      customer_type: userId ? "user" : "guest",
      user_id: userId || null,
      customer_email: data.email,
      customer_first_name: data.firstName,
      customer_last_name: data.lastName,
      customer_phone: data.phone || undefined,
      shipping_address: data.address,
      shipping_city: data.city || "",
      shipping_postal_code: data.postalCode || "",
      shipping_country: data.country,
      shipping_notes: data.notes || undefined,
      payment_method: "cash_on_delivery", // Por defecto, se puede cambiar
      payment_status: "pending",
      subtotal: subtotal,
      shipping_cost: 0, // Se puede calcular después
      tax_amount: 0,
      discount_amount: 0,
      total_amount: total,
      currency_code: currencyCode,
      items: orderItems,
    })

    if (!order) {
      throw new Error("No se pudo crear el pedido")
    }

    // Guardar el número de pedido en localStorage
    localStorage.setItem("last_order_number", order.order_number)
    localStorage.setItem("last_order_id", order.id)

    // Enviar correo de confirmación con factura
    try {
      const response = await fetch("/api/orders/send-confirmation-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: data.email,
          customerName: `${data.firstName} ${data.lastName}`,
        }),
      })

      if (!response.ok) {
        console.error("Error al enviar correo de confirmación")
        // No fallar el proceso si el correo falla
      }
    } catch (emailError) {
      console.error("Error al enviar correo:", emailError)
      // No fallar el proceso si el correo falla
    }

    toast.success(`Pedido creado: ${order.order_number}`)

    // Si hay un checkoutUrl de Shopify y estamos usando ese carrito, redirigir allí
    if (hasShopifyItems && cart?.checkoutUrl) {
      setTimeout(() => {
        window.location.href = cart.checkoutUrl
      }, 1000)
    } else {
      // Redirigir a la página de éxito
      router.push(`/checkout/success?order=${order.order_number}`)
    }
  }

  const handleGuestCheckoutComplete = async (data: GuestCustomerData) => {
    setIsProcessing(true)
    setCustomerData(data)

    try {
      // Guardar datos del cliente en localStorage para uso posterior
      localStorage.setItem("guest_customer_data", JSON.stringify(data))

      // Procesar el pedido
      await processOrder(data, null)
    } catch (error) {
      console.error("Error procesando checkout:", error)
      toast.error("Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.")
      // Limpiar el estado si hay un error para que se muestre el formulario nuevamente
      setIsProcessing(false)
      setCustomerData(null)
      localStorage.removeItem("guest_customer_data")
    }
  }

  // Mostrar loading solo mientras se carga la autenticación o el carrito
  if (authLoading || (cart === undefined && !isPending && !hasLocalItems)) {
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

  // Si ambos carritos están vacíos, no mostrar nada (el useEffect redirigirá)
  if (!hasAnyItems) {
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
              />
            ) : (
              <GuestCheckoutForm
                onComplete={handleGuestCheckoutComplete}
                isLoading={isProcessing}
              />
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
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {hasShopifyItems && cart ? (
                  cart.lines.map((item) => (
                    <div
                      key={item.merchandise.id}
                      className="flex justify-between items-start pb-3 border-b"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {item.merchandise.product.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold ml-4">
                        {formatPrice(
                          item.cost.totalAmount.amount,
                          item.cost.totalAmount.currencyCode
                        )}
                      </p>
                    </div>
                  ))
                ) : (
                  localCart.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-start pb-3 border-b"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Cantidad: {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-semibold ml-4">
                        {formatPrice(
                          ((parseFloat((item.salePrice || item.price).replace(/[$,]/g, "")) || 0) * item.quantity).toString(),
                          "COP"
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {hasShopifyItems && cart
                      ? formatPrice(
                          cart.cost.subtotalAmount.amount,
                          cart.cost.subtotalAmount.currencyCode
                        )
                      : formatPrice(localCart.getTotal().toString(), "COP")}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Envío</span>
                  <span className="text-muted-foreground">
                    Calculado al finalizar
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Impuestos</span>
                  <span className="text-muted-foreground">
                    Calculado al finalizar
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>
                    {hasShopifyItems && cart
                      ? formatPrice(
                          cart.cost.totalAmount.amount,
                          cart.cost.totalAmount.currencyCode
                        )
                      : formatPrice(localCart.getTotal().toString(), "COP")}
                  </span>
                </div>
              </div>

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

