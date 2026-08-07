import type { EmailOtpType } from "@supabase/supabase-js"

import { getSupabaseBrowserClient } from "@/lib/supabase/client"

// Every Auth catalog link this app now emits (lib/email/auth-hook.ts's
// buildActionPath) carries `token_hash`+`type` -- device-independent,
// verified with verifyOtp, and preferred (originally bug-reset-password-pkce-
// vs-hash's decision, D7) over `?code`, which stays readable only for
// GoTrue's hosted templates and any link already sent before the Send Email
// Hook took over. app/auth/reset-password and app/auth/callback both read a
// link, decide its shape, and claim it the same way; they differ only in
// which `type` they accept and what they do after a successful claim, so
// that part stays with each page.
export type EmailLink =
  | { kind: "tokenHash"; tokenHash: string; type: string }
  | { kind: "code"; code: string }
  | { kind: "absent" }

export function readEmailLink({
  tokenHash,
  linkType,
  code,
  acceptType,
}: {
  tokenHash: string | null
  linkType: string | null
  code: string | null
  acceptType?: (type: string) => boolean
}): EmailLink {
  if (tokenHash && linkType && (!acceptType || acceptType(linkType))) {
    return { kind: "tokenHash", tokenHash, type: linkType }
  }
  if (code) {
    return { kind: "code", code }
  }
  return { kind: "absent" }
}

export type EmailLinkRejection =
  | { cause: "noTokenInLink" }
  | { cause: "verificationUnavailable" }
  | { cause: "refusedByAuth"; detail: string }

export type EmailLinkClaim = { outcome: "claimed" } | { outcome: "rejected"; reason: EmailLinkRejection }

export async function claimEmailLink(link: EmailLink): Promise<EmailLinkClaim> {
  if (link.kind === "absent") {
    return { outcome: "rejected", reason: { cause: "noTokenInLink" } }
  }

  const supabase = getSupabaseBrowserClient()
  if (!supabase) {
    return { outcome: "rejected", reason: { cause: "verificationUnavailable" } }
  }

  try {
    const { error } =
      link.kind === "tokenHash"
        ? await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.type as EmailOtpType })
        : await supabase.auth.exchangeCodeForSession(link.code)

    if (error) {
      return { outcome: "rejected", reason: { cause: "refusedByAuth", detail: error.message } }
    }

    return { outcome: "claimed" }
  } catch (error) {
    console.error("[Auth] Error al canjear el link:", error)
    return { outcome: "rejected", reason: { cause: "verificationUnavailable" } }
  }
}
