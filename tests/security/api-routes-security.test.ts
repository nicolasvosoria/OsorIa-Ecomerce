import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as getStore } from "@/app/api/store/route";
import { POST as postSendConfirmationEmail } from "@/app/api/orders/send-confirmation-email/route";
import { getSupabaseEcommerce } from "@/lib/supabase/client";
import { getOrderById } from "@/lib/supabase/orders-api";

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: vi.fn(),
}));

vi.mock("@/lib/supabase/orders-api", () => ({
  getOrderById: vi.fn(),
}));

const mockedGetSupabaseEcommerce = vi.mocked(getSupabaseEcommerce);
const mockedGetOrderById = vi.mocked(getOrderById);

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

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;
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

  it("returns 400 for invalid send-confirmation-email payload", async () => {
    const request = new NextRequest(
      "http://localhost/api/orders/send-confirmation-email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: "84f0a892-cf12-4826-befd-cf64e1235123",
          orderNumber: "A-1001",
          customerEmail: "correo-invalido",
        }),
      },
    );

    const response = await postSendConfirmationEmail(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("Payload inválido");
    expect(body.detail).toContain("customerEmail");
  });

  it("masks internal send errors from runtime response", async () => {
    process.env.SMTP_HOST = "smtp.test.dev";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "mailer@test.dev";
    process.env.SMTP_PASS = "secret";
    process.env.SMTP_FROM = "OSORIA <mailer@test.dev>";

    mockedGetOrderById.mockResolvedValue({
      id: "84f0a892-cf12-4826-befd-cf64e1235123",
      order_number: "A-1001",
      order_date: "2026-01-10T10:00:00.000Z",
      customer_first_name: "Ada",
      customer_last_name: "Lovelace",
      payment_method: "credit_card",
      shipping_address: "Calle 123",
      shipping_city: "Bogotá",
      shipping_postal_code: "110111",
      shipping_country: "Colombia",
      currency_code: "COP",
      items: [],
      subtotal: 0,
      shipping_cost: 0,
      total_amount: 0,
    } as any);

    const request = new NextRequest(
      "http://localhost/api/orders/send-confirmation-email",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId: "84f0a892-cf12-4826-befd-cf64e1235123",
          orderNumber: "A-1001",
          customerEmail: "buyer@example.com",
          customerName: "Ada Lovelace",
        }),
      },
    );

    const response = await postSendConfirmationEmail(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Pedido creado pero el correo no pudo ser enviado",
    );
    expect(body.warning).toContain("pedido fue procesado correctamente");
    expect(body.error).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain(
      "Configuración SMTP no encontrada",
    );
    expect(JSON.stringify(body)).not.toContain("nodemailer");
  });
});
