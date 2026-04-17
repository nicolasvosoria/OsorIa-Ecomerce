import { sanitizePublicUrl } from "@/lib/security/html-sanitization";

type EnvValue = string | undefined;

export interface ResolveEmailBaseUrlInput {
  requestOrigin?: EnvValue;
  appUrl?: EnvValue;
  vercelUrl?: EnvValue;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export type SmtpConfigResult =
  | {
      ok: true;
      config: SmtpConfig;
    }
  | {
      ok: false;
      missing: Array<"SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS">;
      from: string;
    };

type MissingSmtpKey = "SMTP_HOST" | "SMTP_PORT" | "SMTP_USER" | "SMTP_PASS";

export function resolveEmailBaseUrl({
  requestOrigin,
  appUrl,
  vercelUrl,
}: ResolveEmailBaseUrlInput): string {
  const fallbackVercelUrl = vercelUrl ? `https://${vercelUrl}` : "";

  return (
    sanitizePublicUrl(requestOrigin || "") ||
    sanitizePublicUrl(appUrl || "") ||
    sanitizePublicUrl(fallbackVercelUrl) ||
    ""
  );
}

export function resolveSmtpConfig(
  env: Record<string, EnvValue>,
): SmtpConfigResult {
  const smtpHost = env.SMTP_HOST;
  const smtpPort = env.SMTP_PORT;
  const smtpUser = env.SMTP_USER;
  const smtpPass = env.SMTP_PASS;
  const smtpFrom = env.SMTP_FROM || smtpUser || "noreply@tutienda.com";

  const missing: MissingSmtpKey[] = [];

  if (!smtpHost) missing.push("SMTP_HOST");
  if (!smtpPort) missing.push("SMTP_PORT");
  if (!smtpUser) missing.push("SMTP_USER");
  if (!smtpPass) missing.push("SMTP_PASS");

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      from: smtpFrom,
    };
  }

  const host = smtpHost as string;
  const portText = smtpPort as string;
  const user = smtpUser as string;
  const pass = smtpPass as string;
  const port = Number.parseInt(portText, 10);

  return {
    ok: true,
    config: {
      host,
      port,
      secure: port === 465,
      user,
      pass,
      from: smtpFrom,
    },
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Error desconocido al enviar correo";
}
