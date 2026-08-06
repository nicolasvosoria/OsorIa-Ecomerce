// D26: fails OPEN without TURNSTILE_SECRET_KEY, except in a live production
// deploy, which fails CLOSED. Production is `VERCEL_ENV === "production"`,
// not `NODE_ENV` -- Vercel sets NODE_ENV to "production" for every built
// deployment, previews included, so only VERCEL_ENV can tell a live deploy
// from a preview one.
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
        msg: "turnstile: TURNSTILE_SECRET_KEY is not configured, skipping verification (fail-open outside production)",
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
