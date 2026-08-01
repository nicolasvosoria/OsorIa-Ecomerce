import type { SupabaseAuthClient } from "@/lib/supabase/server-auth-session"

// El objeto que devuelve client.schema("ecommerce"). Los tres callers de sesión
// tienen que entregar ESTE cliente a orders-api: si alguno vuelve a pasar el
// cliente crudo, la consulta viaja con Accept-Profile: public —donde orders no
// existe— y el assert de identidad lo delata antes que producción.
export const ECOMMERCE_SCOPED_CLIENT = { scopedTo: "ecommerce" }

export function createSessionAuthClient(userId: string | null): SupabaseAuthClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
    schema: (schema: string) => {
      if (schema !== "ecommerce") {
        throw new Error(`Consulta inesperada contra el schema ${schema}`)
      }
      return ECOMMERCE_SCOPED_CLIENT
    },
  } as unknown as SupabaseAuthClient
}
