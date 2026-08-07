// D1: delivery is the Resend HTTP API, never SMTP/Nodemailer. Plain `fetch`
// on purpose -- this module has no Node- or Deno-specific import, so both the
// Next.js server (if a future slice needs a synchronous send) and the Deno
// email-worker Edge Function (supabase/functions/email-worker/index.ts) can
// import it unchanged.

const RESEND_API_URL = "https://api.resend.com/emails";

export type ResendSendEmailInput = {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  idempotencyKey: string;
};

export type ResendSendEmailResult =
  | { ok: true; providerMessageId: string }
  // `retryable`: whether this failure carries ANY evidence the message
  // itself was rejected -- see isRetryableFailure below. lib/email/
  // outbox-worker.ts is the only reader: true routes to
  // markTransientFailure (never advances D16/A10's terminal ladder), false
  // routes to markFailed (advances it exactly as before).
  | { ok: false; retryable: boolean; errorCode: string; errorMessage: string };

export async function sendEmailViaResend(apiKey: string, input: ResendSendEmailInput): Promise<ResendSendEmailResult> {
  let response: Response;
  try {
    response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // D1: retried HTTP calls (network blip, worker crash mid-request) never
        // produce a second Resend send for the same outbox row.
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: input.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });
  } catch (error) {
    // A network-level failure (DNS, connection reset, timeout) never even
    // reached Resend -- there is no response to have an opinion about this
    // message's fate, so this can only ever be retryable. See the
    // idempotency-replay reasoning below.
    return {
      ok: false,
      retryable: true,
      errorCode: "network_error",
      errorMessage: error instanceof Error ? error.message : "No se pudo contactar a Resend",
    };
  }

  const body: unknown = await response.json().catch(() => null);

  if (response.ok && isRecord(body) && typeof body.id === "string") {
    return { ok: true, providerMessageId: body.id };
  }

  // D18: Resend's 429 error body distinguishes `daily_quota_exceeded` /
  // `monthly_quota_exceeded` / `rate_limit_exceeded` by `name` -- that raw
  // code is what mark_email_outbox_failed persists as last_error_code so
  // quota failures stay visible and distinct from any other delivery error.
  const errorCode = isRecord(body) && typeof body.name === "string" ? body.name : `http_${response.status}`;
  const errorMessage = isRecord(body) && typeof body.message === "string" ? body.message : `Resend respondió ${response.status}`;

  return { ok: false, retryable: isRetryableFailure(response.status, errorCode), errorCode, errorMessage };
}

// D16/A10 + Resend's own documented idempotency-replay behavior
// (resend.com/docs/dashboard/emails/idempotency-keys, "How it works":
// replaying a key whose original call already succeeded returns that SAME
// cached response verbatim -- Resend never re-evaluates the payload on a
// replay, so a replay can never come back as a FRESH rejection of a message
// it already accepted). That means a REPLAY's non-2xx (the case a reclaimed,
// ambiguous-fate row's send always is -- see lib/email/outbox-worker.ts) can
// only ever be one of two things:
//   - Resend's own transport failing to answer AT ALL: any 5xx, `rate_limit_
//     exceeded` (too many requests per second, not a quota wall), or
//     `concurrent_idempotent_requests` (Resend's own documented "a request
//     under this key is already in flight, safe to retry later"). None of
//     these carry any evidence the MESSAGE was rejected, on a replay or a
//     first attempt alike.
//   - Resend's authoritative, repeatable word on this exact payload: any
//     other 4xx, including the D18 quota codes (daily_quota_exceeded/
//     monthly_quota_exceeded genuinely reject the send for now, and a
//     replay could only ever repeat that, never invent it) and
//     `invalid_idempotent_request` (the SAME key reused with a DIFFERENT
//     payload -- can't legitimately happen here since every retry replays
//     the exact D13 snapshot, but surfacing it as terminal rather than
//     silently retrying forever is the safer default if it ever does).
// The first group is retryable and must never advance the terminal ladder;
// the second is not, and advances it exactly as before.
const RETRYABLE_ERROR_CODES = new Set(["rate_limit_exceeded", "concurrent_idempotent_requests"]);

function isRetryableFailure(status: number, errorCode: string): boolean {
  return status >= 500 || RETRYABLE_ERROR_CODES.has(errorCode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
