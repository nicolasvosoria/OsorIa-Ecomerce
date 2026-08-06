import type { EmailTemplateKind } from "./types.ts";

const AUTH_SENDER = "Osoria <auth@mail.osoria.help>";
const COMMERCE_SENDER_DOMAIN = "mail.osoria.help";

export type EmailSender = {
  from: string;
  replyTo?: string;
};

// D3: two sender identities, never a tenant `From` domain. Auth-and-console
// kinds (account/access/identity actions reached through getAdminUrl, never a
// customer) use the fixed platform sender. Everything else is a commerce
// notification about a specific store's order or mailbox, sent as that store
// "vía Osoria" with its own verified Reply-To -- `verifiedReplyTo` is null
// until D6's confirmation lands, so the header is simply omitted until then
// rather than guessing an address nobody confirmed.
export function resolveEmailSender(
  kind: EmailTemplateKind,
  storeDisplayName: string,
  verifiedReplyTo: string | null,
): EmailSender {
  if (AUTH_SENDER_KINDS.has(kind)) {
    return { from: AUTH_SENDER };
  }

  return {
    from: `${storeDisplayName} vía Osoria <pedidos@${COMMERCE_SENDER_DOMAIN}>`,
    ...(verifiedReplyTo ? { replyTo: verifiedReplyTo } : {}),
  };
}

const AUTH_SENDER_KINDS = new Set<EmailTemplateKind>([
  "signup-confirmation",
  "owner-invite",
  "new-user-invite",
  "password-recovery",
  "password-changed",
  "store-mailbox-verification",
  "membership-acceptance",
]);
