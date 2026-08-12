import { beforeEach, describe, expect, it, vi } from "vitest";

// getCheckoutPrefill (D4) resuelve la sesión con getSupabaseAuthClient (cookies)
// y delega la consulta a getMostRecentOrderByUserId; ese query ya se prueba a
// nivel de orders-api (tests/orders/orders-api.store-scope.test.ts), así que
// aquí se aísla y mockea para probar solo la puerta de sesión y el mapeo.
const {
  getSupabaseAuthClientMock,
  getMostRecentOrderByUserIdMock,
  getAccountProfileMock,
  findDefaultUserAddressMock,
} = vi.hoisted(() => ({
  getSupabaseAuthClientMock: vi.fn(),
  getMostRecentOrderByUserIdMock: vi.fn(),
  getAccountProfileMock: vi.fn(),
  findDefaultUserAddressMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}));

vi.mock("@/lib/supabase/orders-api", () => ({
  createOrder: vi.fn(),
  getMostRecentOrderByUserId: getMostRecentOrderByUserIdMock,
}));

// D16: la libreta guardada es la fuente nueva del prefill. Su lectura ya se
// prueba contra el doble de tabla (tests/account/user-addresses-api.test.ts),
// así que aquí se aísla para probar de qué fuente bebe el checkout.
vi.mock("@/lib/supabase/account-profile-api", () => ({
  getAccountProfile: getAccountProfileMock,
}));

vi.mock("@/lib/supabase/user-addresses-api", () => ({
  findDefaultUserAddress: findDefaultUserAddressMock,
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ host: "localhost" }),
}));

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: vi.fn(),
}));

import { getCheckoutPrefill } from "@/app/checkout/actions";
import {
  createSessionAuthClient,
  ECOMMERCE_SCOPED_CLIENT,
} from "@/tests/fixtures/session-auth-client";

const SAVED_DEFAULT_ADDRESS = {
  id: "address-1",
  label: "Casa",
  addressLine1: "Calle 10 # 4-5",
  departmentCode: "11",
  departmentName: "Bogotá, D.C.",
  city: "Bogotá",
  municipalityCode: "11001",
  locationId: "1",
  postalCode: "110111",
  country: "Colombia",
  isDefault: true,
};

// D24: toPrefillFields siempre devuelve las cinco claves del destino
// estructurado, aunque no haya dirección guardada -- "" en ese caso, nunca
// ausentes. Se comparte para no repetir el mismo objeto vacío en cada test
// que no tiene libreta.
const NO_LOCATION_PREFILL = {
  departmentCode: "",
  departmentName: "",
  city: "",
  municipalityCode: "",
  locationId: "",
};

const SAVED_LOCATION_PREFILL = {
  departmentCode: "11",
  departmentName: "Bogotá, D.C.",
  city: "Bogotá",
  municipalityCode: "11001",
  locationId: "1",
};

describe("getCheckoutPrefill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountProfileMock.mockResolvedValue(null);
    findDefaultUserAddressMock.mockResolvedValue(null);
  });

  it("denies an anonymous caller: no order lookup and an empty result", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient(null));

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

  it("denies an anonymous caller the saved account data too", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient(null));

    await getCheckoutPrefill();

    expect(getAccountProfileMock).not.toHaveBeenCalled();
    expect(findDefaultUserAddressMock).not.toHaveBeenCalled();
  });

  // D16: en cuanto hay una dirección guardada, el checkout deja de adivinar.
  it("prefers the saved default address over the most recent order", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-3"));
    getAccountProfileMock.mockResolvedValue({
      firstName: "Ana",
      lastName: "Osorio",
      phone: "3009998877",
    });
    findDefaultUserAddressMock.mockResolvedValue(SAVED_DEFAULT_ADDRESS);
    getMostRecentOrderByUserIdMock.mockResolvedValue({
      customer_phone: "3001234567",
      shipping_address: "Cra 1 # 2-3",
    });

    const result = await getCheckoutPrefill();

    expect(findDefaultUserAddressMock).toHaveBeenCalledWith("user-3", expect.anything());
    // D24: solo la calle -- el destino estructurado (departamento/municipio)
    // llega por su cuenta en vez de venir aplanado dentro de "address".
    expect(result).toEqual({
      phone: "3009998877",
      address: "Calle 10 # 4-5",
      ...SAVED_LOCATION_PREFILL,
    });
    expect(getMostRecentOrderByUserIdMock).not.toHaveBeenCalled();
  });

  // A1: el teléfono vive en el perfil, así que cuenta como dato guardado por sí
  // solo aunque todavía no haya ninguna dirección.
  it("uses the saved phone even when no address is saved yet", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-4"));
    getAccountProfileMock.mockResolvedValue({
      firstName: null,
      lastName: null,
      phone: "3009998877",
    });
    getMostRecentOrderByUserIdMock.mockResolvedValue(null);

    expect(await getCheckoutPrefill()).toEqual({
      phone: "3009998877",
      address: "",
      ...NO_LOCATION_PREFILL,
    });
  });

  // El teléfono (perfil) y la dirección (libreta) se guardan por separado: con
  // solo uno de los dos, el otro campo se queda vacío si no se consulta el
  // último pedido, que es justo el prefill que el checkout ya ofrecía.
  it("completes the missing address from the most recent order", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-7"));
    getAccountProfileMock.mockResolvedValue({
      firstName: null,
      lastName: null,
      phone: "3009998877",
    });
    getMostRecentOrderByUserIdMock.mockResolvedValue({
      customer_phone: "3001234567",
      shipping_address: "Cra 1 # 2-3",
    });

    expect(await getCheckoutPrefill()).toEqual({
      phone: "3009998877",
      address: "Cra 1 # 2-3",
      ...NO_LOCATION_PREFILL,
    });
  });

  it("completes the missing phone from the most recent order", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-8"));
    findDefaultUserAddressMock.mockResolvedValue(SAVED_DEFAULT_ADDRESS);
    getMostRecentOrderByUserIdMock.mockResolvedValue({
      customer_phone: "3001234567",
      shipping_address: "Cra 1 # 2-3",
    });

    expect(await getCheckoutPrefill()).toEqual({
      phone: "3001234567",
      address: "Calle 10 # 4-5",
      ...SAVED_LOCATION_PREFILL,
    });
  });

  // Hoy casi nadie tiene libreta: quitarle el prefill del último pedido sería
  // una regresión del checkout que ya existía.
  it("falls back to the most recent order when the account has nothing saved", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-5"));
    getMostRecentOrderByUserIdMock.mockResolvedValue({
      customer_phone: "3001234567",
      shipping_address: "Cra 1 # 2-3",
    });

    expect(await getCheckoutPrefill()).toEqual({
      phone: "3001234567",
      address: "Cra 1 # 2-3",
      ...NO_LOCATION_PREFILL,
    });
  });

  // Un fallo leyendo la cuenta no puede tumbar el checkout: es una comodidad.
  it("still prefills from the last order when the saved account data cannot be read", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-6"));
    findDefaultUserAddressMock.mockRejectedValue(new Error("permission denied"));
    getMostRecentOrderByUserIdMock.mockResolvedValue({
      customer_phone: "3001234567",
      shipping_address: "Cra 1 # 2-3",
    });

    expect(await getCheckoutPrefill()).toEqual({
      phone: "3001234567",
      address: "Cra 1 # 2-3",
      ...NO_LOCATION_PREFILL,
    });
  });

  it("maps the signed-in customer's most recent order into phone/address prefill data", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-1"));
    getMostRecentOrderByUserIdMock.mockResolvedValue({
      customer_phone: "3001234567",
      shipping_address: "Cra 1 # 2-3",
    });

    const result = await getCheckoutPrefill();

    // Las tablas del ecommerce no existen en el schema public, que es donde nace
    // el cliente de sesión: sin acotarlo esta lectura vuelve siempre vacía.
    expect(getMostRecentOrderByUserIdMock).toHaveBeenCalledWith(
      "user-1",
      ECOMMERCE_SCOPED_CLIENT,
    );
    expect(result).toEqual({ phone: "3001234567", address: "Cra 1 # 2-3", ...NO_LOCATION_PREFILL });
  });

  it("returns null when the signed-in customer has no previous orders", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(createSessionAuthClient("user-2"));
    getMostRecentOrderByUserIdMock.mockResolvedValue(null);

    const result = await getCheckoutPrefill();

    expect(result).toBeNull();
  });
});
