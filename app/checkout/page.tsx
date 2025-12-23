"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCart } from "@/components/cart/cart-context"
import { GuestCheckoutForm, GuestCustomerData } from "@/components/checkout/guest-checkout-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ShoppingBag } from "lucide-react"
import { formatPrice } from "@/lib/shopify/utils"
import { toast } from "sonner"
import Link from "next/link"

export default function CheckoutPage() {
  const router = useRouter()
  const { cart, isPending } = useCart()
  const [customerData, setCustomerData] = useState<GuestCustomerData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Redirigir si el carrito está vacío
    if (!isPending && (!cart || cart.lines.length === 0)) {
      toast.error("Tu carrito está vacío")
      router.push("/shop")
    }
  }, [cart, isPending, router])

  const handleGuestCheckoutComplete = async (data: GuestCustomerData) => {
    setIsProcessing(true)
    setCustomerData(data)

    try {
      // Guardar datos del cliente en localStorage para uso posterior
      localStorage.setItem("guest_customer_data", JSON.stringify(data))

      // Crear el pedido en Supabase
      if (cart && cart.lines.length > 0) {
        const { createOrder } = await import("@/lib/supabase/orders-api")
        
        // Preparar los items del pedido
        const orderItems = cart.lines.map((line) => {
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

        // Crear el pedido
        const order = await createOrder({
          customer_type: "guest",
          user_id: null,
          customer_email: data.email,
          customer_first_name: data.firstName,
          customer_last_name: data.lastName,
          customer_phone: data.phone,
          shipping_address: data.address,
          shipping_city: data.city,
          shipping_postal_code: data.postalCode,
          shipping_country: data.country,
          shipping_notes: data.notes,
          payment_method: "cash_on_delivery", // Por defecto, se puede cambiar
          payment_status: "pending",
          subtotal: parseFloat(cart.cost.subtotalAmount.amount),
          shipping_cost: 0, // Se puede calcular después
          tax_amount: parseFloat(cart.cost.totalTaxAmount.amount || "0"),
          discount_amount: 0,
          total_amount: parseFloat(cart.cost.totalAmount.amount),
          currency_code: cart.cost.totalAmount.currencyCode,
          items: orderItems,
        })

        if (order) {
          // Guardar el número de pedido en localStorage
          localStorage.setItem("last_order_number", order.order_number)
          localStorage.setItem("last_order_id", order.id)

          toast.success(`Pedido creado: ${order.order_number}`)

          // Si hay un checkoutUrl de Shopify, redirigir allí
          if (cart.checkoutUrl) {
            setTimeout(() => {
              window.location.href = cart.checkoutUrl
            }, 1000)
          } else {
            // Redirigir a la página de éxito
            router.push(`/checkout/success?order=${order.order_number}`)
          }
        } else {
          throw new Error("No se pudo crear el pedido")
        }
      } else {
        throw new Error("El carrito está vacío")
      }
    } catch (error) {
      console.error("Error procesando checkout:", error)
      toast.error("Hubo un error al procesar tu pedido. Por favor, intenta de nuevo.")
      setIsProcessing(false)
    }
  }

  if (isPending || !cart || cart.lines.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Cargando carrito...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/shop">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a la tienda
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Finalizar Compra</h1>
        <p className="text-muted-foreground">
          Completa tus datos para procesar tu pedido
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de Checkout */}
        <div className="lg:col-span-2">
          {!customerData ? (
            <GuestCheckoutForm
              onComplete={handleGuestCheckoutComplete}
              isLoading={isProcessing}
            />
          ) : (
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
          )}
        </div>

        {/* Resumen del Pedido */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {cart.lines.map((item) => (
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
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    {formatPrice(
                      cart.cost.subtotalAmount.amount,
                      cart.cost.subtotalAmount.currencyCode
                    )}
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
                    {formatPrice(
                      cart.cost.totalAmount.amount,
                      cart.cost.totalAmount.currencyCode
                    )}
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

