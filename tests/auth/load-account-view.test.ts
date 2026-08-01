import { beforeEach, describe, expect, it, vi } from "vitest";

// La puerta de sesión de /auth/cuenta vive en el servidor, como la de /orders:
// quien no trae cookie de sesión no recibe el formulario de contraseña, no se
// le oculta en el cliente. El perfil y la libreta se aíslan porque cada uno se
// prueba contra su propio doble de tabla (tests/account).
const { getSupabaseAuthClientMock, getAccountProfileMock, listUserAddressesMock } = vi.hoisted(
  () => ({
    getSupabaseAuthClientMock: vi.fn(),
    getAccountProfileMock: vi.fn(),
    listUserAddressesMock: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/admin-route-auth", () => ({
  getSupabaseAuthClient: getSupabaseAuthClientMock,
}));

vi.mock("@/lib/supabase/account-profile-api", () => ({
  getAccountProfile: getAccountProfileMock,
}));

vi.mock("@/lib/supabase/user-addresses-api", () => ({
  listUserAddresses: listUserAddressesMock,
}));

import { loadAccountPageView } from "@/app/auth/cuenta/load-account-view";

const SAVED_ADDRESS = {
  id: "address-1",
  label: "Casa",
  addressLine1: "Calle 10 # 4-5",
  city: "Bogotá",
  postalCode: null,
  country: "Colombia",
  isDefault: true,
};

function authClientFor(user: { id: string; email?: string } | null) {
  return { auth: { getUser: async () => ({ data: { user } }) } };
}

describe("loadAccountPageView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAccountProfileMock.mockResolvedValue(null);
    listUserAddressesMock.mockResolvedValue([]);
  });

  it("reports no session when the request carries no signed-in user", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor(null));

    expect(await loadAccountPageView()).toEqual({ authenticated: false });
  });

  it("reports no session when no auth client is configured", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(null);

    expect(await loadAccountPageView()).toEqual({ authenticated: false });
  });

  // Sin sesión no se consulta nada: el patrón sesión-primero-consulta-después.
  it("reads neither the profile nor the address book without a session", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor(null));

    await loadAccountPageView();

    expect(getAccountProfileMock).not.toHaveBeenCalled();
    expect(listUserAddressesMock).not.toHaveBeenCalled();
  });

  // D18: el correo se enseña fijo, así que la vista lo trae ya resuelto.
  it("carries the signed-in email, profile and saved addresses", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(
      authClientFor({ id: "user-1", email: "duena@tienda.test" }),
    );
    getAccountProfileMock.mockResolvedValue({
      firstName: "Ana",
      lastName: "Osorio",
      phone: "3001234567",
    });
    listUserAddressesMock.mockResolvedValue([SAVED_ADDRESS]);

    expect(await loadAccountPageView()).toEqual({
      authenticated: true,
      email: "duena@tienda.test",
      profile: { firstName: "Ana", lastName: "Osorio", phone: "3001234567" },
      addresses: [SAVED_ADDRESS],
    });
  });

  // D22: la fila de perfil puede no existir todavía, y eso es una pantalla
  // vacía que se puede rellenar, no un error.
  it("shows an empty profile to someone whose profile row does not exist yet", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(
      authClientFor({ id: "user-1", email: "duena@tienda.test" }),
    );

    const view = await loadAccountPageView();

    expect(view).toMatchObject({
      authenticated: true,
      profile: { firstName: null, lastName: null, phone: null },
      addresses: [],
    });
  });

  it("keeps the session when the account has no email on record", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(authClientFor({ id: "user-1" }));

    expect(await loadAccountPageView()).toMatchObject({ authenticated: true, email: null });
  });

  it("asks only for the signed-in person's own rows", async () => {
    getSupabaseAuthClientMock.mockResolvedValue(
      authClientFor({ id: "user-1", email: "duena@tienda.test" }),
    );

    await loadAccountPageView();

    expect(getAccountProfileMock).toHaveBeenCalledWith("user-1", expect.anything());
    expect(listUserAddressesMock).toHaveBeenCalledWith("user-1", expect.anything());
  });
});
