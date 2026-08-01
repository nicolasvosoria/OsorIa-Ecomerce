import type { SavedAddress } from "@/lib/account/saved-address";
import type { AccountProfile } from "@/lib/account/schemas";
import { getAccountProfile } from "@/lib/supabase/account-profile-api";
import { resolveServerAuthSession } from "@/lib/supabase/server-auth-session";
import { listUserAddresses } from "@/lib/supabase/user-addresses-api";

export type AccountPageView =
  | { authenticated: false }
  | {
      authenticated: true;
      email: string | null;
      profile: AccountProfile;
      addresses: SavedAddress[];
    };

const NO_PROFILE_YET: AccountProfile = { firstName: null, lastName: null, phone: null };

// La sesión se resuelve en el servidor, igual que /orders: a quien no la tiene
// no se le esconde el formulario, no se le manda. El correo viaja ya resuelto
// porque la pantalla lo enseña fijo (D18); el perfil y la libreta se leen con el
// cliente de sesión, así que la RLS por dueño es la que recorta lo que vuelve.
export async function loadAccountPageView(): Promise<AccountPageView> {
  const session = await resolveServerAuthSession();
  if (!session) {
    return { authenticated: false };
  }

  const [profile, addresses] = await Promise.all([
    getAccountProfile(session.userId, session.client),
    listUserAddresses(session.userId, session.client),
  ]);

  return {
    authenticated: true,
    email: session.email,
    // Quien todavía no tiene fila de perfil ve el formulario vacío, no un error:
    // guardarlo es justo lo que la crea (D22).
    profile: profile ?? NO_PROFILE_YET,
    addresses,
  };
}
