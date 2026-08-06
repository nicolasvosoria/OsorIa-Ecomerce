import { createVerificationToken } from "@/lib/security/verification-token";
import { ECOMMERCE_TABLES } from "@/lib/supabase/contract";

// D23's catalog-complete purpose set (see the auth_intents table comment):
// this slice only ever mints 'signup' and 'recovery'. 'owner_invite' and
// 'new_user_invite' exist in the schema for slice 6 to mint against without
// another migration; nothing here writes them.
export type AuthIntentPurpose = "signup" | "recovery" | "owner_invite" | "new_user_invite";

const INTENT_LIFETIME_MS = 60 * 60 * 1000; // D24: one hour

// Minted by the server AFTER the store has already been resolved trustworthily
// (lib/auth/prepare-auth-redirect.ts, via getRuntimeStoreId() in the SAME
// request the customer is acting on) -- never re-derived here, never taken
// from a client-supplied ID (D23). Only the hash is persisted; the plaintext
// travels solely inside the emailed link's query string.
export async function mintAuthIntent(
  supabase: any,
  input: { storeId: string; purpose: AuthIntentPurpose; email: string },
): Promise<string> {
  const { token, tokenHash } = createVerificationToken();

  const { error } = await supabase.from(ECOMMERCE_TABLES.authIntents).insert({
    store_id: input.storeId,
    purpose: input.purpose,
    email: input.email.toLowerCase(),
    token_hash: tokenHash,
    expires_at: new Date(Date.now() + INTENT_LIFETIME_MS).toISOString(),
  });

  if (error) {
    throw new Error(`No se pudo preparar el enlace de autenticación: ${error.message ?? error}`);
  }

  return token;
}
