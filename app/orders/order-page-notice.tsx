"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCheckoutLoginIntent } from "@/contexts/checkout-login-intent-context";
import { useLanguage } from "@/contexts/language-context";

interface OrderPageNoticeProps {
  title: string;
  description: string;
  action: ReactNode;
}

// Historial y detalle comparten el mismo gesto cuando no hay un pedido que
// enseñar, y ninguno de esos estados deja al cliente sin a dónde ir: la acción
// es obligatoria y es una sola.
export function OrderPageNotice({ title, description, action }: OrderPageNoticeProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <Package className="h-16 w-16 text-muted-foreground md:h-24 md:w-24" />
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          <p className="max-w-md text-muted-foreground">{description}</p>
          {action}
        </div>
      </div>
    </div>
  );
}

// El guest jamás llega a estas pantallas vía una lectura de pedidos (D5): el
// único CTA disponible es el puente de login de checkout (slice 4), reusado
// tal cual para esta señal genérica de "inicia sesión".
export function SignInToSeeOrdersNotice() {
  const { t } = useLanguage();
  const { requestLogin } = useCheckoutLoginIntent();

  return (
    <OrderPageNotice
      title={t.orders.guestTitle}
      description={t.orders.guestDescription}
      action={<Button onClick={requestLogin}>{t.checkout.guestLoginCta}</Button>}
    />
  );
}

// Sin tienda resuelta no se puede saber qué pedidos son de aquí, y una lista
// vacía sería una mentira con la forma de "no tienes pedidos" (D17). La salida
// es reintentar: la identidad de tienda la repone el siguiente request.
export function StoreUnresolvedOrdersNotice() {
  const { t } = useLanguage();
  const router = useRouter();

  return (
    <OrderPageNotice
      title={t.orders.unavailableTitle}
      description={t.orders.unavailableDescription}
      action={<Button onClick={() => router.refresh()}>{t.errorPage.tryAgain}</Button>}
    />
  );
}
