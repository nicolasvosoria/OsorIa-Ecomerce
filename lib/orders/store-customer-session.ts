import type { StoreCustomerOrderAuth } from "@/lib/supabase/orders-api";
import {
  ecommerceForSession,
  resolveServerAuthSession,
} from "@/lib/supabase/server-auth-session";
import { getRuntimeStoreId } from "@/lib/utils/store";

export type StoreCustomerOrdersSession =
  | { status: "guest" }
  | { status: "storeUnresolved" }
  | {
      status: "ready";
      auth: StoreCustomerOrderAuth;
      ecommerce: ReturnType<typeof ecommerceForSession>;
    };

// Las dos pantallas de pedidos (historial y detalle) necesitan lo mismo antes de
// consultar nada: quién pregunta (sesión) y desde qué tienda (host). Sin tienda
// resuelta la respuesta no puede ser una lista vacía: eso le diría a un cliente
// con pedidos que no tiene ninguno, que es justo la mentira que D17 evita.
export async function resolveStoreCustomerOrdersSession(): Promise<StoreCustomerOrdersSession> {
  const session = await resolveServerAuthSession();
  if (!session) {
    return { status: "guest" };
  }

  const storeId = await getRuntimeStoreId();
  if (!storeId) {
    return { status: "storeUnresolved" };
  }

  return {
    status: "ready",
    auth: { storeId, userId: session.userId },
    ecommerce: ecommerceForSession(session.client),
  };
}
