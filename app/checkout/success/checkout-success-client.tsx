"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GuestCustomerData } from "@/components/checkout/guest-checkout-form";
import type { SuccessPageOrderSummary } from "@/app/checkout/success/fallback-order";
import { useCart as useLocalCart } from "@/contexts/cart-context";
import { useLanguage } from "@/contexts/language-context";
import { deferStateUpdate } from "@/lib/react/defer-state-update";
import { formatPrice } from "@/lib/commerce/utils";
import { PAYMENT_METHODS } from "@/lib/checkout/payment-methods";

interface CheckoutSuccessClientProps {
  initialOrderNumber: string | null;
  initialCustomerData: GuestCustomerData | null;
  initialOrderSummary: SuccessPageOrderSummary | null;
}

export function CheckoutSuccessClient({
  initialOrderNumber,
  initialCustomerData,
  initialOrderSummary,
}: CheckoutSuccessClientProps) {
  const searchParams = useSearchParams();
  const localCart = useLocalCart();
  const { t } = useLanguage();
  const [customerData, setCustomerData] = useState<GuestCustomerData | null>(
    initialCustomerData,
  );
  const [orderNumber, setOrderNumber] = useState<string | null>(
    initialOrderNumber,
  );
  const clearedOrdersRef = useRef<Set<string>>(new Set());
  const localCartRef = useRef(localCart);
  const orderSummary = initialOrderSummary;
  const paymentMethodLabel = orderSummary
    ? PAYMENT_METHODS.find((method) => method.id === orderSummary.paymentMethod)
        ?.label ?? orderSummary.paymentMethod
    : null;

  useEffect(() => {
    localCartRef.current = localCart;
  }, [localCart]);

  useEffect(() => {
    const orderFromUrl = searchParams.get("order");
    const orderFromStorage = localStorage.getItem("last_order_number");
    const currentOrderNumber =
      initialOrderNumber || orderFromUrl || orderFromStorage;
    deferStateUpdate(() => {
      setOrderNumber(currentOrderNumber);

      if (initialCustomerData) {
        setCustomerData(initialCustomerData);
        return;
      }

      const savedData = localStorage.getItem("guest_customer_data");
      if (savedData) {
        try {
          setCustomerData(JSON.parse(savedData));
        } catch (error) {
          console.error("Error parsing customer data:", error);
        }
      }
    });
  }, [initialCustomerData, initialOrderNumber, searchParams]);

  useEffect(() => {
    const currentOrderNumber = orderNumber;
    if (!currentOrderNumber) return;

    if (clearedOrdersRef.current.has(currentOrderNumber)) {
      return;
    }

    clearedOrdersRef.current.add(currentOrderNumber);

    const clearCarts = () => {
      console.log(
        "[Checkout Success] Limpiando carrito para pedido:",
        currentOrderNumber,
      );

      localCartRef.current.clearCart();
      console.log("[Checkout Success] Carrito local limpiado");

      localStorage.removeItem("guest_customer_data");
      localStorage.removeItem("last_order_id");
      console.log("[Checkout Success] Datos del localStorage limpiados");
    };

    clearCarts();
  }, [orderNumber]);

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
            Gracias por tu compra. Hemos recibido tu pedido y te contactaremos
            pronto.
          </CardDescription>
          {orderNumber && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">
                Número de Pedido
              </p>
              <p className="text-2xl font-bold">{orderNumber}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Guarda este número para consultar el estado de tu pedido
              </p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {orderSummary && (
            <div className="text-left space-y-4 p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">{t.checkout.orderSummary}</h3>
              <div className="space-y-3">
                {orderSummary.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start pb-3 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {item.quantity} × {item.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t.checkout.unitPrice}:{" "}
                        {formatPrice(item.unitPrice, item.currencyCode)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold ml-4">
                      {formatPrice(item.totalPrice, item.currencyCode)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-base font-bold pt-3 border-t">
                <span>{t.cart.total}</span>
                <span>
                  {formatPrice(orderSummary.totalAmount, orderSummary.currencyCode)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {t.checkout.paymentMethod}
                </span>
                <span>{paymentMethodLabel}</span>
              </div>
            </div>
          )}

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
              {customerData?.email || "tu correo"} con los detalles de tu
              pedido.
            </p>
            <p className="text-muted-foreground">
              Si tienes alguna pregunta, no dudes en contactarnos.
            </p>
          </div>

          <div className="flex justify-center pt-4">
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
  );
}
