import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as getStore } from "@/app/api/store/route";
import { getSupabaseEcommerce } from "@/lib/supabase/client";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
}));

const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);

function makeStoreQueryResult(row: Record<string, unknown>) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle,
  };

  return {
    from: vi.fn().mockReturnValue(query),
  };
}

describe("route security contracts", () => {
  let errorSpy: any;
  let warnSpy: any;
  let logSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("returns 400 for invalid /api/store lookup params", async () => {
    const request = new NextRequest("http://localhost/api/store?id=not-a-uuid");

    const response = await getStore(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "id inválido" });
    expect(mockedGetSupabaseEcommerce).not.toHaveBeenCalled();
  });

  it("keeps /api/store response limited to public columns", async () => {
    mockedGetSupabaseEcommerce.mockReturnValue(
      makeStoreQueryResult({
        id: "84f0a892-cf12-4826-befd-cf64e1235123",
        subdomain: "electronica",
        store_name: "Electrónica Premium",
        domain: "electronica.example.com",
        is_active: true,
        is_public: true,
        logo_url: "https://cdn.example.com/logo.png",
        primary_color: "#111111",
        secondary_color: "#ffffff",
        currency_code: "COP",
        owner_email: "owner@example.com",
        metadata: { privateToken: "secret" },
      }) as never,
    );

    const request = new NextRequest(
      "http://localhost/api/store?subdomain=electronica",
    );

    const response = await getStore(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      id: "84f0a892-cf12-4826-befd-cf64e1235123",
      subdomain: "electronica",
      store_name: "Electrónica Premium",
      domain: "electronica.example.com",
      is_active: true,
      is_public: true,
      logo_url: "https://cdn.example.com/logo.png",
      primary_color: "#111111",
      secondary_color: "#ffffff",
      currency_code: "COP",
    });
    expect(body).not.toHaveProperty("owner_email");
    expect(body).not.toHaveProperty("metadata");
  });
});
