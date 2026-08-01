import type { SavedAddress } from "@/lib/account/saved-address"
import type { SavedAddressDraft } from "@/lib/account/schemas"
import { ECOMMERCE_TABLES } from "./contract"
import { ecommerceForSession, type SupabaseAuthClient } from "./server-auth-session"

type UserAddressRow = {
  id: string
  label: string | null
  address_line_1: string
  city: string | null
  postal_code: string | null
  country: string
  is_default: boolean
}

type AddressTarget = { userId: string; addressId: string }

const ADDRESS_COLUMNS = "id, label, address_line_1, city, postal_code, country, is_default"

const ADDRESS_NOT_FOUND = "Esa dirección ya no existe en tu libreta."

// Toda escritura filtra además por user_id: la política RLS ya recorta al dueño
// (D16, sin rama de admin), y el filtro explícito hace que la consulta no
// dependa de esa política para acertar la fila.
export async function listUserAddresses(
  userId: string,
  client: SupabaseAuthClient,
): Promise<SavedAddress[]> {
  const { data, error } = await userAddresses(client)
    .select(ADDRESS_COLUMNS)
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(`No se pudieron leer tus direcciones: ${error.message}`)
  }

  return ((data ?? []) as UserAddressRow[]).map(toSavedAddress)
}

export async function findDefaultUserAddress(
  userId: string,
  client: SupabaseAuthClient,
): Promise<SavedAddress | null> {
  const { data, error } = await userAddresses(client)
    .select(ADDRESS_COLUMNS)
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo leer tu dirección predeterminada: ${error.message}`)
  }

  return data ? toSavedAddress(data as UserAddressRow) : null
}

// La primera dirección de una persona nace predeterminada: quien acaba de
// guardar la única que tiene no debería además tener que marcarla. Sin ninguna
// predeterminada previa el índice parcial está libre, así que el insert no
// puede chocar con él.
export async function createUserAddress(
  { userId, draft }: { userId: string; draft: SavedAddressDraft },
  client: SupabaseAuthClient,
): Promise<void> {
  const currentDefault = await findDefaultUserAddress(userId, client)

  const { error } = await userAddresses(client).insert({
    user_id: userId,
    ...toAddressFields(draft),
    is_default: currentDefault === null,
  })

  if (error) {
    throw new Error(`No se pudo guardar la dirección: ${error.message}`)
  }
}

// Nunca toca is_default: cambiar la predeterminada obliga a despejar la
// anterior, así que esa regla vive entera en setDefaultUserAddress y no
// repartida por cada guardado.
export async function updateUserAddress(
  { userId, addressId, draft }: AddressTarget & { draft: SavedAddressDraft },
  client: SupabaseAuthClient,
): Promise<void> {
  const { data, error } = await userAddresses(client)
    .update({ ...toAddressFields(draft), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", addressId)
    .select("id")

  if (error) {
    throw new Error(`No se pudo guardar la dirección: ${error.message}`)
  }

  assertRowTouched(data)
}

// Borrar la predeterminada no deja a la persona sin ninguna: si le quedan
// direcciones, la más reciente toma el relevo, porque es la que mejor describe
// dónde vive hoy. El orden es lo que lo hace seguro — el borrado ya sacó la
// fila del índice parcial, así que marcar a la sucesora no puede chocar.
export async function deleteUserAddress(
  { userId, addressId }: AddressTarget,
  client: SupabaseAuthClient,
): Promise<void> {
  const { data, error } = await userAddresses(client)
    .delete()
    .eq("user_id", userId)
    .eq("id", addressId)
    .select("id, is_default")

  if (error) {
    throw new Error(`No se pudo eliminar la dirección: ${error.message}`)
  }

  const [deleted] = assertRowTouched<Pick<UserAddressRow, "id" | "is_default">>(data)
  if (!deleted.is_default) {
    return
  }

  await promoteNewestAddressToDefault(userId, client)
}

// El índice parcial user_addresses_single_default_per_user prohíbe dos
// predeterminadas a la vez, así que marcar la nueva antes de despejar la vieja
// falla siempre. El orden es la garantía: primero se despeja cualquier otra
// predeterminada de la persona —eso solo saca filas del índice y nunca puede
// chocar— y solo entonces se marca la elegida, ya con el índice libre. La
// elegida queda fuera del despeje para que volver a marcar la que ya lo era no
// abra un hueco sin ninguna predeterminada.
export async function setDefaultUserAddress(
  { userId, addressId }: AddressTarget,
  client: SupabaseAuthClient,
): Promise<void> {
  const { error } = await userAddresses(client)
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_default", true)
    .neq("id", addressId)

  if (error) {
    throw new Error(`No se pudo cambiar la dirección predeterminada: ${error.message}`)
  }

  await markAddressAsDefault({ userId, addressId }, client)
}

async function promoteNewestAddressToDefault(
  userId: string,
  client: SupabaseAuthClient,
): Promise<void> {
  const { data, error } = await userAddresses(client)
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`No se pudo elegir tu nueva dirección predeterminada: ${error.message}`)
  }

  if (!data) {
    return
  }

  await markAddressAsDefault({ userId, addressId: (data as { id: string }).id }, client)
}

async function markAddressAsDefault(
  { userId, addressId }: AddressTarget,
  client: SupabaseAuthClient,
): Promise<void> {
  const { data, error } = await userAddresses(client)
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("id", addressId)
    .select("id")

  if (error) {
    throw new Error(`No se pudo cambiar la dirección predeterminada: ${error.message}`)
  }

  assertRowTouched(data)
}

function userAddresses(client: SupabaseAuthClient) {
  return ecommerceForSession(client).from(ECOMMERCE_TABLES.userAddresses)
}

// Una escritura que no tocó ninguna fila apuntaba a una dirección que no es de
// esta persona o que ya no existe: sin esto volvería como éxito silencioso.
function assertRowTouched<TRow>(rows: TRow[] | null): TRow[] {
  if (!rows || rows.length === 0) {
    throw new Error(ADDRESS_NOT_FOUND)
  }

  return rows
}

function toAddressFields(draft: SavedAddressDraft) {
  return {
    label: draft.label,
    address_line_1: draft.addressLine1,
    city: draft.city,
    postal_code: draft.postalCode,
    country: draft.country,
  }
}

function toSavedAddress(row: UserAddressRow): SavedAddress {
  return {
    id: row.id,
    label: row.label,
    addressLine1: row.address_line_1,
    city: row.city,
    postalCode: row.postal_code,
    country: row.country,
    isDefault: row.is_default,
  }
}
