import { ECOMMERCE_FUNCTIONS, ECOMMERCE_TABLES } from "./contract";
import { hashVerificationToken } from "@/lib/security/verification-token";
import type { TenantEmailBranding } from "@/lib/email/types";
import type { StoreIdentitySnapshot } from "@/lib/stores/identity-readiness";
import type { MailboxVerificationField } from "@/lib/stores/schemas";

// logoUrl/primaryColor live here, not on StoreIdentitySnapshot: A8 dropped
// them from the readiness gate, but they still serve email branding (D3) --
// lib/checkout/order-notifications.ts reads them to render the order emails,
// same as app/admin/actions/store-identity.ts already does for the mailbox
// verification email.
export type StoreIdentityView = StoreIdentitySnapshot & {
  logoUrl: string | null;
  primaryColor: string | null;
  subdomain: string;
  contactEmail: string | null;
  replyToEmail: string | null;
  replyToPendingEmail: string | null;
  orderMailboxEmail: string | null;
  orderMailboxPendingEmail: string | null;
};

// One read for the settings panel: three satellite tables (D5 puts the new
// fields "beside their natural domains" instead of one new table), joined in
// application code the same way lib/supabase/stores-admin-api.ts already
// reads store_branding and store_contact as separate queries.
export async function loadStoreIdentity(supabase: any, storeId: string): Promise<StoreIdentityView> {
  const [storeResult, brandingResult, contactResult] = await Promise.all([
    supabase.from(ECOMMERCE_TABLES.stores).select("store_name, subdomain, legal_name").eq("id", storeId).maybeSingle(),
    supabase.from(ECOMMERCE_TABLES.storeBranding).select("logo_url, primary_color").eq("store_id", storeId).maybeSingle(),
    supabase
      .from(ECOMMERCE_TABLES.storeContact)
      .select(
        "contact_email, contact_phone, address, reply_to_email, reply_to_pending_email, reply_to_verified_at, order_mailbox_email, order_mailbox_pending_email, order_mailbox_verified_at",
      )
      .eq("store_id", storeId)
      .maybeSingle(),
  ]);

  assertQuerySucceeded("la tienda", storeResult.error);
  assertQuerySucceeded("la marca de la tienda", brandingResult.error);
  assertQuerySucceeded("el contacto de la tienda", contactResult.error);

  if (!storeResult.data) {
    throw new Error("La tienda no existe");
  }

  const store = storeResult.data;
  const branding = brandingResult.data;
  const contact = contactResult.data;

  return {
    displayName: store.store_name ?? null,
    legalName: store.legal_name ?? null,
    subdomain: store.subdomain,
    logoUrl: branding?.logo_url ?? null,
    primaryColor: branding?.primary_color ?? null,
    phone: contact?.contact_phone ?? null,
    commercialAddress: contact?.address ?? null,
    contactEmail: contact?.contact_email ?? null,
    replyToEmail: contact?.reply_to_email ?? null,
    replyToPendingEmail: contact?.reply_to_pending_email ?? null,
    replyToVerifiedAt: contact?.reply_to_verified_at ?? null,
    orderMailboxEmail: contact?.order_mailbox_email ?? null,
    orderMailboxPendingEmail: contact?.order_mailbox_pending_email ?? null,
    orderMailboxVerifiedAt: contact?.order_mailbox_verified_at ?? null,
  };
}

// The one place branding is read off StoreIdentityView into email copy --
// every caller (lib/checkout/order-notifications.ts, memberships-api.ts,
// stores-admin-api.ts, the mailbox-verification action) uses this so a
// store's footer -- logo, address, email, phone -- never differs by which
// email it's on.
export function toTenantEmailBranding(identity: StoreIdentityView): TenantEmailBranding {
  return {
    displayName: identity.displayName ?? "",
    validatedSubdomain: identity.subdomain,
    primaryColor: identity.primaryColor ?? "",
    commercialAddress: identity.commercialAddress ?? "",
    ...(identity.logoUrl ? { logoUrl: identity.logoUrl } : {}),
    ...(identity.contactEmail ? { contactEmail: identity.contactEmail } : {}),
    ...(identity.phone ? { contactPhone: identity.phone } : {}),
  };
}

function assertQuerySucceeded(label: string, error: unknown): void {
  if (!error) return;
  throw new Error(`No se pudo leer ${label}`, { cause: error });
}

export type MailboxVerificationConfirmation =
  | { ok: true; field: MailboxVerificationField }
  | { ok: false };

// Reached anonymously from app/auth/mailbox-verification -- the caller only
// ever has a token from a URL, never a session, so this hashes it the same
// way the request side did and hands the hash to the one function allowed to
// read store_mailbox_verifications (D30).
export async function confirmStoreMailboxVerification(
  supabase: any,
  token: string,
): Promise<MailboxVerificationConfirmation> {
  const { data, error } = await supabase.rpc(ECOMMERCE_FUNCTIONS.confirmStoreMailboxVerification, {
    p_token_hash: hashVerificationToken(token),
  });

  assertQuerySucceeded("la confirmación del correo", error);

  if (!data?.ok) {
    return { ok: false };
  }

  return { ok: true, field: data.field };
}
