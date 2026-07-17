import { beforeEach, describe, expect, it, vi } from "vitest";

// getCheckoutPrefill (D4) resuelve la sesión con getSupabaseAuthClient (cookies)
// y delega la consulta a getMostRecentOrderByUserId; ese query ya se prueba a
// nivel de orders-api (tests/orders/orders-api.store-scope.test.ts), así que
// aquí se aísla y mockea para probar solo la puerta de sesión y el mapeo.
const { getSupabaseAuthClientMock, getMostRecentOrderByUserIdMock } = vi.hoisted(() => ({
  getSupabaseAuthClientMock: vi.fn(),
  getMostRecentOrderByUserIdMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}));

vi.mock("@/lib/supabase/orders-api", () => ({
  createOrder: vi.fn(),
  getMostRecentOrderByUserId: getMostRecentOrderByUserIdMock,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost" }),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));

import { getCheckoutPrefill } from "@/app/checkout/actions";

function authClientFor(userId: string | null) {
  return {
    auth: {
      getUser: async () => ({ data: { user: userId ? { id: userId } : null } }),
    },
  };
}

describe("getCheckoutPrefill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("denies an anonymous caller: no order lookup and an empty result", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor(null));

    const result = await getCheckoutPrefill();

    expect(result).toBeNull();
    expect(getMostRecentOrderByUserIdMock).not.toHaveBeenCalled();
  });

  it("denies a caller with no auth client configured", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(null);

    const result = await getCheckoutPrefill();

    expect(result).toBeNull();
    expect(getMostRecentOrderByUserIdMock).not.toHaveBeenCalled();
  });

  it("maps the signed-in customer's most recent order into phone/address prefill data", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor("user-1"));
    getMostRecentOrderByUserIdMock.mockResolvedValue({
      customer_phone: "3001234567",
      shipping_address: "Cra 1 # 2-3",
    });

    const result = await getCheckoutPrefill();

    expect(getMostRecentOrderByUserIdMock).toHaveBeenCalledWith("user-1", expect.anything());
    expect(result).toEqual({ phone: "3001234567", address: "Cra 1 # 2-3" });
  });

  it("returns null when the signed-in customer has no previous orders", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor("user-2"));
    getMostRecentOrderByUserIdMock.mockResolvedValue(null);

    const result = await getCheckoutPrefill();

    expect(result).toBeNull();
  });
});
