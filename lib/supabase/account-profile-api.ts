import type { AccountProfile } from "@/lib/account/schemas"
import { ECOMMERCE_TABLES } from "./contract"
import { ecommerceForSession, type SupabaseAuthClient } from "./server-auth-session"

type UserProfileRow = {
  first_name: string | null
  last_name: string | null
  phone: string | null
}

const PROFILE_COLUMNS = "first_name, last_name, phone"

// Devuelve null cuando la persona todavía no tiene fila de perfil, que es un
// estado normal y no un error: el trigger que la crea vive en otra app.
export async function getAccountProfile(
  userId: string,
  client: SupabaseAuthClient,
): Promise<AccountProfile | null> {
  const { data, error } = await userProfiles(client)
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudieron leer tus datos: ${error.message}`)
  }

  return data ? toAccountProfile(data as UserProfileRow) : null
}

// UPSERT y no UPDATE (D22): la fila de user_profiles puede no existir todavía
// —el trigger que la crea vive en otra app y el alta del cliente puede haber
// fallado— y un update sobre cero filas volvería como éxito sin haber guardado
// nada. El correo viaja porque la columna es NOT NULL y hace falta en el
// insert; sale de la sesión, nunca del formulario (D18).
export async function upsertAccountProfile(
  {
    userId,
    email,
    profile,
  }: { userId: string; email: string; profile: AccountProfile },
  client: SupabaseAuthClient,
): Promise<void> {
  const { data, error } = await userProfiles(client)
    .upsert(
      {
        id: userId,
        email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone: profile.phone,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("id")

  if (error) {
    throw new Error(`No se pudieron guardar tus datos: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error("No se pudieron guardar tus datos: la escritura no dejó ninguna fila.")
  }
}

function userProfiles(client: SupabaseAuthClient) {
  return ecommerceForSession(client).from(ECOMMERCE_TABLES.userProfiles)
}

function toAccountProfile(row: UserProfileRow): AccountProfile {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
  }
}
