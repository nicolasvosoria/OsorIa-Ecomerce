// D26: signup and password recovery are protected by Cloudflare Turnstile.
// Plain `fetch` against Cloudflare's siteverify endpoint, same style as
// lib/email/resend-client.ts's call to Resend -- no SDK, no new dependency
// (A4's hazard).
//
// Unconfigured-keys decision: FAIL OPEN, loudly logged, rather than fail
// closed. Slice 7 is the only place real keys ever get set (the HARD
// BOUNDARY forbids any live infra before it), so "unconfigured" is not an
// edge case here -- it is the actual state of every environment this slice
// ships into: local dev, CI, and this repo's whole existing signup/recovery
// test surface (tests/auth/signUp.test.ts, tests/auth/password-recovery-
// dialog.test.tsx, etc.), none of which set TURNSTILE_SECRET_KEY. Failing
// closed would make signup and recovery entirely unusable everywhere until
// slice 7, and would contradict this slice's own verify criterion that both
// the configured and unconfigured states must be exercisable. D25's
// dedicated per-store/per-purpose/per-recipient rate limiter (reused, not
// rebuilt) already bounds the abuse this gate exists to catch while keys are
// absent, so the residual exposure is a real but narrower one: a live,
// deployed, MIS-configured project after slice 7 -- exactly the case the
// loud log line below exists to surface.
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerification =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: "missing_token" | "verification_failed" };

export async function verifyTurnstile(token: string | null): Promise<TurnstileVerification> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.warn(
      JSON.stringify({
        level: "warn",
        msg: "turnstile: TURNSTILE_SECRET_KEY is not configured, skipping verification (fail-open until slice 7 sets real keys)",
      }),
    );
    return { ok: true, skipped: true };
  }

  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const verified = await callSiteverify(secretKey, token);
  return verified ? { ok: true, skipped: false } : { ok: false, reason: "verification_failed" };
}

async function callSiteverify(secretKey: string, token: string): Promise<boolean> {
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: secretKey, response: token }),
    });
    const body: unknown = await response.json().catch(() => null);
    return isRecord(body) && body.success === true;
  } catch (error) {
    console.error(
      JSON.stringify({ level: "error", msg: "turnstile: siteverify request failed", error: String(error) }),
    );
    return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
