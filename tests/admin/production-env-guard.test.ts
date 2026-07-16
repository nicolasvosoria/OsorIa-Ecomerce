import { describe, expect, it } from "vitest"

import { assertAdminCookieSecretConfigured } from "@/lib/admin/production-env-guard"

describe("assertAdminCookieSecretConfigured", () => {
  it("throws in production when the secret is missing", () => {
    expect(() =>
      assertAdminCookieSecretConfigured({
        nodeEnv: "production",
        adminCookieSecret: undefined,
      }),
    ).toThrow(/ADMIN_COOKIE_SECRET/)
  })

  it("throws in production when the secret is an empty string", () => {
    expect(() =>
      assertAdminCookieSecretConfigured({
        nodeEnv: "production",
        adminCookieSecret: "",
      }),
    ).toThrow(/ADMIN_COOKIE_SECRET/)
  })

  it("does not throw in production when the secret is set", () => {
    expect(() =>
      assertAdminCookieSecretConfigured({
        nodeEnv: "production",
        adminCookieSecret: "a-real-secret",
      }),
    ).not.toThrow()
  })

  it("does not throw outside production even when the secret is missing", () => {
    expect(() =>
      assertAdminCookieSecretConfigured({
        nodeEnv: "development",
        adminCookieSecret: undefined,
      }),
    ).not.toThrow()

    expect(() =>
      assertAdminCookieSecretConfigured({
        nodeEnv: "test",
        adminCookieSecret: undefined,
      }),
    ).not.toThrow()
  })
})
