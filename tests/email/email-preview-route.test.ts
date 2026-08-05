import { describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/email-preview/route";

function createRequest(template: string | null): Request {
  const search = template === null ? "" : `?template=${template}`;
  return new Request(`http://localhost:3000/api/email-preview${search}`);
}

describe("email preview route", () => {
  it("renders only a selected fixture in development", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = await GET(createRequest("order-received") as never);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("PREVIEW-1001");
  });

  it("rejects missing and arbitrary template selectors", async () => {
    vi.stubEnv("NODE_ENV", "development");

    expect((await GET(createRequest(null) as never)).status).toBe(400);
    expect((await GET(createRequest("../../send?to=attacker@example.com") as never)).status).toBe(400);
  });

  it("is unavailable outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");

    expect((await GET(createRequest("order-received") as never)).status).toBe(404);
  });
});

import { GET as getLegacyPreview } from "@/app/api/orders/send-confirmation-email/route";

describe("legacy order preview route", () => {
  it("redirects development previews to the fixture-only catalog", () => {
    vi.stubEnv("NODE_ENV", "development");

    const response = getLegacyPreview(createRequest("to=attacker@example.com") as never);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/api/email-preview?template=order-received",
    );
  });
});
