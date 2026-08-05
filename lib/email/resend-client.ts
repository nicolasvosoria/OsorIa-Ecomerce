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
  | { ok: false; errorCode: string; errorMessage: string };

export async function sendEmailViaResend(apiKey: string, input: ResendSendEmailInput): Promise<ResendSendEmailResult> {
  const response = await fetch(RESEND_API_URL, {
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

  return { ok: false, errorCode, errorMessage };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
