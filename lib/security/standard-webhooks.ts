// `node:` prefix (not bare "crypto"/a bare `Buffer` global): this file is
// imported by supabase/functions/auth-email-hook (D15), and Deno only
// resolves Node built-ins through that prefix and does not expose `Buffer`
// as a global the way Node does -- Node itself has supported both since
// 14.18, so neither is a Node/Next compatibility trade-off.
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";

// D15: the Auth Hook verifies Standard Webhooks signatures (standardwebhooks.com,
// the same scheme Supabase's Send Email Hook and Resend both speak) before
// trusting a request body. Implemented by hand against the spec rather than
// pulling in the `standardwebhooks`/`svix` package (A4's dependency hazard --
// this is one HMAC call, not worth a floating-`latest` dependency), the same
// call as `crypto` already used by lib/security/verification-token.ts.
//
// Signed content is `${id}.${timestamp}.${rawBody}`, HMAC-SHA256 keyed by the
// base64-decoded secret (the `whsec_` prefix stripped first), base64-encoded,
// compared against each `v1,<signature>` entry in the space-separated
// `webhook-signature` header. A five-minute tolerance both directions is the
// spec's own replay-protection recommendation and Supabase's own default.

const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;
const SECRET_PREFIX = "whsec_";

export type StandardWebhookHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};

export type StandardWebhookVerification =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_headers" | "malformed_secret" | "timestamp_out_of_tolerance" | "signature_mismatch";
    };

export function verifyStandardWebhookSignature(
  rawBody: string,
  headers: StandardWebhookHeaders,
  secret: string,
  options: { toleranceSeconds?: number; nowMs?: number } = {},
): StandardWebhookVerification {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature) {
    return { ok: false, reason: "missing_headers" };
  }

  if (!isFreshTimestamp(timestamp, options.nowMs ?? Date.now(), options.toleranceSeconds ?? SIGNATURE_TOLERANCE_SECONDS)) {
    return { ok: false, reason: "timestamp_out_of_tolerance" };
  }

  const secretBytes = decodeSecret(secret);
  if (!secretBytes) {
    return { ok: false, reason: "malformed_secret" };
  }

  const expected = signContent(`${id}.${timestamp}.${rawBody}`, secretBytes);
  const presentedSignatures = signature.split(" ").map((entry) => entry.split(",")[1]).filter(Boolean);

  const matches = presentedSignatures.some((candidate) => signaturesMatch(candidate as string, expected));
  return matches ? { ok: true } : { ok: false, reason: "signature_mismatch" };
}

function isFreshTimestamp(rawTimestamp: string, nowMs: number, toleranceSeconds: number): boolean {
  const timestampSeconds = Number(rawTimestamp);
  if (!Number.isFinite(timestampSeconds)) return false;

  const deltaSeconds = Math.abs(nowMs / 1000 - timestampSeconds);
  return deltaSeconds <= toleranceSeconds;
}

function decodeSecret(secret: string): Buffer | null {
  if (!secret.startsWith(SECRET_PREFIX)) return null;
  try {
    return Buffer.from(secret.slice(SECRET_PREFIX.length), "base64");
  } catch {
    return null;
  }
}

function signContent(content: string, secretBytes: Buffer): string {
  return createHmac("sha256", secretBytes).update(content).digest("base64");
}

function signaturesMatch(candidateBase64: string, expectedBase64: string): boolean {
  const candidate = Buffer.from(candidateBase64, "base64");
  const expected = Buffer.from(expectedBase64, "base64");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}
