import { describe, expect, it } from "vitest";

import {
  parseStoreLookupParams,
  toPublicStorePayload,
} from "@/lib/security/store-contract";

describe("parseStoreLookupParams", () => {
  it("accepts a valid subdomain lookup", () => {
    const result = parseStoreLookupParams(
      new URLSearchParams("subdomain=electronica"),
    );

    expect(result).toEqual({ kind: "subdomain", value: "electronica" });
  });

  it("rejects an invalid UUID id lookup", () => {
    const result = parseStoreLookupParams(new URLSearchParams("id=not-a-uuid"));

    expect(result.kind).toBe("invalid");
    if (result.kind === "invalid") {
      expect(result.status).toBe(400);
      expect(result.error).toBe("id inválido");
    }
  });
});

describe("toPublicStorePayload", () => {
  it("returns only the public contract fields", () => {
    const payload = toPublicStorePayload({
      id: "84f0a892-cf12-4826-befd-cf64e1235123",
      subdomain: "electronica",
      store_name: "Electrónica Premium",
      domain: "electronica.example.com",
      is_active: true,
      is_public: true,
      logo_url: "https://cdn.example.com/logo.png",
      primary_color: "#111111",
      secondary_color: "#FFFFFF",
      currency_code: "COP",
      owner_email: "owner@example.com",
      metadata: { privateToken: "secret" },
    });

    expect(payload).toEqual({
      id: "84f0a892-cf12-4826-befd-cf64e1235123",
      subdomain: "electronica",
      store_name: "Electrónica Premium",
      domain: "electronica.example.com",
      is_active: true,
      is_public: true,
      logo_url: "https://cdn.example.com/logo.png",
      primary_color: "#111111",
      secondary_color: "#FFFFFF",
      currency_code: "COP",
    });
  });
});
