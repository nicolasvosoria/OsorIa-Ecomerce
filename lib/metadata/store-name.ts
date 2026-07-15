import { getStoreFromServer } from '@/lib/supabase/store-api'

const NEUTRAL_STORE_NAME = 'Tienda'

// Resuelve el nombre de la tienda para la metadata SSR/estática. En build (sin
// contexto de request) `getStoreFromServer` puede devolver null; degradamos a
// un nombre neutro en vez de una marca hardcodeada para no romper el prerender.
export async function resolveStoreNameForMetadata(): Promise<string> {
  const store = await getStoreFromServer()
  return store?.store_name?.trim() || NEUTRAL_STORE_NAME
}
