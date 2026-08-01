import { getSupabaseAuthClient } from "@/lib/supabase/admin-route-auth";
import { ECOMMERCE_SCHEMA } from "@/lib/supabase/contract";

export type SupabaseAuthClient = NonNullable<Awaited<ReturnType<typeof getSupabaseAuthClient>>>;

export type ServerAuthSession = {
  userId: string;
  email: string | null;
  client: SupabaseAuthClient;
};

// Idioma común a getCheckoutPrefill (app/checkout/actions.ts), loadOrdersPageView
// (app/orders/load-orders-view.ts) y loadOrderForSessionUser
// (app/checkout/success/fallback-order.ts): sin cliente de sesión (cookies) o sin
// user_id, no hay sesión que resolver, así que cada caller sigue el patrón
// sesión-primero-consulta-después sin tocar la base de datos.
export async function resolveServerAuthSession(): Promise<ServerAuthSession | null> {
  const authClient = await getSupabaseAuthClient();
  const user = (await authClient?.auth.getUser())?.data?.user;
  if (!authClient || !user) {
    return null;
  }
  return { userId: user.id, email: user.email ?? null, client: authClient };
}

// El cliente de sesión nace en el schema por defecto de PostgREST (public), que
// no tiene ninguna tabla del ecommerce; apuntarlo a ecommerce es lo mismo que
// hacen getSupabaseEcommerce y el cliente de servicio.
export function ecommerceForSession(client: SupabaseAuthClient) {
  return client.schema(ECOMMERCE_SCHEMA);
}
