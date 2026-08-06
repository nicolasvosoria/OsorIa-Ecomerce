// D26: signup and password recovery are protected by Cloudflare Turnstile.
// Plain `fetch` against Cloudflare's siteverify endpoint, same style as
// lib/email/resend-client.ts's call to Resend -- no SDK, no new dependency
// (A4's hazard).
//
// Unconfigured-keys decision: the split below is by RUNTIME, not by a single
// global rule. Slice 7 is the only place real keys ever get set (the HARD
// BOUNDARY forbids any live infra before it), so "unconfigured" is the
// actual state of every environment except a live production deploy: local
// dev, CI, preview deploys, and this repo's whole existing signup/recovery
// test surface (tests/auth/signUp.test.ts, tests/auth/password-recovery-
// dialog.test.tsx, etc.), none of which set TURNSTILE_SECRET_KEY. Those keep
// failing OPEN, loudly logged -- failing closed there would make signup and
// recovery entirely unusable everywhere until slice 7, and would contradict
// this slice's own verify criterion that both the configured and
// unconfigured states must be exercisable.
//
// Production is different: a real, publicly reachable deploy with the
// secret missing or misspelled means the widget still renders and solves
// (it's gated by the separate, public NEXT_PUBLIC_TURNSTILE_SITE_KEY) while
// the server silently ignores every token, with no signal beyond a log line
// indistinguishable from routine noise. D25's rate limiter bounds volume,
// not the absence of CAPTCHA friction -- so a misconfigured production
// deploy fails CLOSED instead, loudly, via console.error.
//
// Production is detected with `VERCEL_ENV === "production"`, not
// `NODE_ENV`: Vercel sets NODE_ENV to "production" for every built
// deployment INCLUDING previews, so NODE_ENV alone can't tell a live
// production deploy from a preview one -- and previews never have the
// secret either, so failing closed on NODE_ENV would break them the same
// way it breaks local dev and CI. VERCEL_ENV is the signal Vercel provides
// specifically to distinguish "production" / "preview" / "development"; it
// is unset outside Vercel (local dev, CI), which keeps this repo's whole
// existing test surface on the fail-open path with no extra stubbing.
const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileVerification =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: "missing_token" | "verification_failed" };

export async function verifyTurnstile(token: string | null): Promise<TurnstileVerification> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    if (process.env.VERCEL_ENV === "production") {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "turnstile: TURNSTILE_SECRET_KEY is not configured in production, failing closed",
        }),
      );
      return { ok: false, reason: "verification_failed" };
    }

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
