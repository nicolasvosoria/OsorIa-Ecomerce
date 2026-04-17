import { describe, expect, it } from "vitest";

import {
  getErrorMessage,
  resolveEmailBaseUrl,
  resolveSmtpConfig,
} from "@/lib/security/email-runtime-guards";

describe("email-runtime-guards", () => {
  it("resolves SMTP config with deterministic defaults", () => {
    const result = resolveSmtpConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "587",
      SMTP_USER: "mailer@example.com",
      SMTP_PASS: "secret",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.port).toBe(587);
      expect(result.config.secure).toBe(false);
      expect(result.config.from).toBe("mailer@example.com");
    }
  });

  it("reports explicit missing SMTP keys instead of opaque failures", () => {
    const result = resolveSmtpConfig({
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "465",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toEqual(["SMTP_USER", "SMTP_PASS"]);
    }
  });

  it("prefers request origin over env fallbacks for email assets", () => {
    const baseUrl = resolveEmailBaseUrl({
      requestOrigin: "https://tenant.example.com",
      appUrl: "https://env-app.example.com",
      vercelUrl: "preview.example.vercel.app",
    });

    expect(baseUrl).toBe("https://tenant.example.com/");
  });

  it("normalizes unknown errors to safe string messages", () => {
    expect(getErrorMessage(new Error("falló"))).toBe("falló");
    expect(getErrorMessage("boom")).toBe("boom");
    expect(getErrorMessage({ reason: "x" })).toBe(
      "Error desconocido al enviar correo",
    );
  });
});
