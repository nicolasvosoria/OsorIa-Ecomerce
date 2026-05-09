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
import { useCart as useLocalCart } from "@/contexts/cart-context";
import { useCart as useShopifyCart } from "@/components/cart/cart-context";
import { deferStateUpdate } from "@/lib/react/defer-state-update";

interface CheckoutSuccessClientProps {
  initialOrderNumber: string | null;
  initialCustomerData: GuestCustomerData | null;
}

export function CheckoutSuccessClient({
  initialOrderNumber,
  initialCustomerData,
}: CheckoutSuccessClientProps) {
  const searchParams = useSearchParams();
  const localCart = useLocalCart();
  const shopifyCart = useShopifyCart();
  const [customerData, setCustomerData] = useState<GuestCustomerData | null>(
    initialCustomerData,
  );
  const [orderNumber, setOrderNumber] = useState<string | null>(
    initialOrderNumber,
  );
  const clearedOrdersRef = useRef<Set<string>>(new Set());
  const localCartRef = useRef(localCart);
  const shopifyCartRef = useRef(shopifyCart);

  useEffect(() => {
    localCartRef.current = localCart;
    shopifyCartRef.current = shopifyCart;
  }, [localCart, shopifyCart]);

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

    const clearCarts = async () => {
      console.log(
        "[Checkout Success] Limpiando carritos para pedido:",
        currentOrderNumber,
      );

      const currentLocalCart = localCartRef.current;
      const currentShopifyCart = shopifyCartRef.current;

      currentLocalCart.clearCart();
      console.log("[Checkout Success] Carrito local limpiado");

      try {
        const response = await fetch("/api/cart/clear", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to clear cart: ${response.status}`);
        }

        const result = await response.json();
        console.log("[Checkout Success] Respuesta de API clear:", result);

        await new Promise((resolve) => setTimeout(resolve, 500));

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("cart-cleared"));
        }

        await new Promise((resolve) => setTimeout(resolve, 500));

        const currentCart = currentShopifyCart.cart;
        if (currentCart && currentCart.lines.length > 0) {
          console.log(
            `[Checkout Success] Limpiando ${currentCart.lines.length} items restantes manualmente`,
          );
          const linesToDelete = [...currentCart.lines];
          for (const line of linesToDelete) {
            try {
              await currentShopifyCart.updateItem(
                line.id,
                line.merchandise.id,
                0,
                "delete",
              );
              await new Promise((resolve) => setTimeout(resolve, 200));
            } catch (err) {
              console.warn("[Checkout Success] Error deleting cart line:", err);
            }
          }
        }
      } catch (error) {
        console.error(
          "[Checkout Success] Error clearing Shopify cart via API:",
          error,
        );

        const currentCart = currentShopifyCart.cart;
        if (currentCart && currentCart.lines.length > 0) {
          console.log("[Checkout Success] Intentando limpiar manualmente...");
          const linesToDelete = [...currentCart.lines];
          for (const line of linesToDelete) {
            currentShopifyCart
              .updateItem(line.id, line.merchandise.id, 0, "delete")
              .catch((err) => {
                console.warn(
                  "[Checkout Success] Error en limpieza manual:",
                  err,
                );
              });
          }
        }
      }

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
