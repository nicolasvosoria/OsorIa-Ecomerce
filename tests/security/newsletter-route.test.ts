import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST } from "@/app/api/newsletter/route";

const { createClient } = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient,
}));

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/newsletter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function mockEcommerceClient(upsertResult: { error: unknown }) {
  const upsert = vi.fn().mockResolvedValue(upsertResult);
  const ecommerceClient = { from: vi.fn(() => ({ upsert })) };

  createClient.mockReturnValue({
    schema: vi.fn().mockReturnValue(ecommerceClient),
  });

  return { ecommerceClient, upsert };
}

describe("newsletter subscribe route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("persists a valid email and returns 200 ok", async () => {
    const { ecommerceClient, upsert } = mockEcommerceClient({ error: null });

    const response = await POST(makeRequest({ email: "Reader@Example.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(ecommerceClient.from).toHaveBeenCalledWith("newsletter_subscribers");
    expect(upsert).toHaveBeenCalledWith(
      { email: "reader@example.com" },
      { onConflict: "email", ignoreDuplicates: true },
    );
  });

  it("rejects an invalid email with 400 before touching persistence", async () => {
    const { ecommerceClient } = mockEcommerceClient({ error: null });

    const response = await POST(makeRequest({ email: "not-an-email" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Email inválido" });
    expect(ecommerceClient.from).not.toHaveBeenCalled();
  });

  it("treats a duplicate subscription as an idempotent 200 success", async () => {
    // ignoreDuplicates upserts resolve without an error even on conflict.
    const { upsert } = mockEcommerceClient({ error: null });

    const response = await POST(makeRequest({ email: "reader@example.com" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
