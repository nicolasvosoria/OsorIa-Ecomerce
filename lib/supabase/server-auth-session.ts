import { getSupabaseAuthClient } from "@/lib/supabase/admin-route-auth";

type SupabaseAuthClient = NonNullable<Awaited<ReturnType<typeof getSupabaseAuthClient>>>;

export type ServerAuthSession = { userId: string; client: SupabaseAuthClient };

// Idioma común a getCheckoutPrefill (app/checkout/actions.ts), loadOrdersPageView
// (app/orders/load-orders-view.ts) y loadOrderForSessionUser
// (app/checkout/success/fallback-order.ts): sin cliente de sesión (cookies) o sin
// user_id, no hay sesión que resolver, así que cada caller sigue el patrón
// sesión-primero-consulta-después sin tocar la base de datos.
export async function resolveServerAuthSession(): Promise<ServerAuthSession | null> {
  const authClient = await getSupabaseAuthClient();
  const userId = (await authClient?.auth.getUser())?.data?.user?.id;
  if (!authClient || !userId) {
    return null;
  }
  return { userId, client: authClient };
}
