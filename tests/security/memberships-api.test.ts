import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import {
  addStoreMember,
  clearMustChangePassword,
  listStoresForUser,
  requiresPasswordChange,
  upsertMembershipRole,
} from "@/lib/supabase/memberships-api";

function makeChain(result: { data: unknown; error: unknown }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return builder;
}

function mockService(tables: Record<string, { data: unknown; error?: unknown }>) {
  const chains = Object.fromEntries(
    Object.entries(tables).map(([table, result]) => [
      table,
      makeChain({ data: result.data, error: result.error ?? null }),
    ]),
  );

  const from = vi.fn((table: string) => {
    if (!chains[table]) {
      throw new Error(`unexpected table ${table}`);
    }
    return chains[table];
  });

  createClient.mockReturnValue({ schema: vi.fn().mockReturnValue({ from }) });

  return { chains, from };
}

describe("listStoresForUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  it("lists every non-deleted store for a super_admin, ignoring store_users", async () => {
    const allStores = [{ id: "store-a", store_name: "A", subdomain: "a" }];
    const { from } = mockService({
      user_profiles: { data: { role: "super_admin" } },
      stores: { data: allStores },
    });

    const stores = await listStoresForUser("admin-1");

    expect(stores).toEqual(allStores);
    expect(from).not.toHaveBeenCalledWith("store_users");
  });

  it("lists only the stores the user has a store_users membership in", async () => {
    const memberStores = [{ id: "store-b", store_name: "B", subdomain: "b" }];
    const { chains } = mockService({
      user_profiles: { data: { role: "admin" } },
      store_users: { data: [{ store_id: "store-b" }] },
      stores: { data: memberStores },
    });

    const stores = await listStoresForUser("member-1");

    expect(stores).toEqual(memberStores);
    expect(chains.store_users.eq).toHaveBeenCalledWith("user_id", "member-1");
    expect(chains.stores.in).toHaveBeenCalledWith("id", ["store-b"]);
  });

  it("returns no stores without querying stores when the user has no memberships", async () => {
    const { from } = mockService({
      user_profiles: { data: { role: "admin" } },
      store_users: { data: [] },
    });

    const stores = await listStoresForUser("member-2");

    expect(stores).toEqual([]);
    expect(from).not.toHaveBeenCalledWith("stores");
  });
});

describe("upsertMembershipRole role replacement", () => {
  function mockRoleAssignment(deleteError: { message: string } | null) {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const service = {
      from: vi.fn((table: string) => {
        if (table === "store_users") {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "su-1" }, error: null }) }) }),
            }),
          };
        }

        if (table === "roles") {
          return {
            select: () => ({
              eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "role-1" }, error: null }) }) }),
            }),
          };
        }

        return {
          delete: () => ({ eq: async () => ({ error: deleteError }) }),
          insert,
        };
      }),
    };

    return { service, insert };
  }

  it("replaces the member's role links when the delete succeeds", async () => {
    const { service, insert } = mockRoleAssignment(null);

    const result = await upsertMembershipRole("store-1", "member-1", "admin", service);

    expect(result).toEqual({ success: true });
    expect(insert).toHaveBeenCalledWith({ store_user_id: "su-1", role_id: "role-1" });
  });

  // A discarded delete error plus a successful insert leaves the member holding
  // two role links — exactly the state the delete exists to prevent.
  it("surfaces a failed delete instead of inserting a second role link", async () => {
    const { service, insert } = mockRoleAssignment({ message: "permission denied" });

    const result = await upsertMembershipRole("store-1", "member-1", "admin", service);

    expect(result).toEqual({
      success: false,
      error: "No se pudieron quitar los roles anteriores: permission denied",
    });
    expect(insert).not.toHaveBeenCalled();
  });
});

describe("addStoreMember platform-user provisioning", () => {
  function mockAuthAdmin(createUser: ReturnType<typeof vi.fn>) {
    createClient.mockReturnValue({ auth: { admin: { createUser } } });
  }

  // Ecommerce service the action passes in: happy-path stubs for the membership
  // and role writes, with `existingProfileId` steering findUserIdByEmail and a
  // spy on the user_profiles insert so we can assert the seeded profile.
  function mockEcommerceService(existingProfileId: string | null) {
    const profileInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "user_profiles") {
        return {
          select: () => ({
            ilike: () => ({
              maybeSingle: async () => ({
                data: existingProfileId ? { id: existingProfileId } : null,
                error: null,
              }),
            }),
          }),
          insert: profileInsert,
        };
      }
      if (table === "store_users") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
          }),
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: "su-1" }, error: null }) }) }),
        };
      }
      if (table === "roles") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "role-1" }, error: null }) }) }),
          }),
        };
      }
      if (table === "store_user_roles") {
        return {
          delete: () => ({ eq: async () => ({ error: null }) }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    return { service: { from }, profileInsert };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  // Case 1 — the production path (D21): an email unknown to the whole platform is
  // minted a confirmed account with a strong temporary password, seeded a 'user'
  // profile flagged must_change_password, and that password comes back. No invite
  // link — the shared project's Site URL would send the owner to the wrong app.
  it("mints a confirmed account with a temp password, seeds a must-change profile, and returns the password", async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: "new-uid" } },
      error: null,
    });
    mockAuthAdmin(createUser);
    const { service, profileInsert } = mockEcommerceService(null);

    const result = await addStoreMember("store-1", "  NUEVO@Correo.com ", "owner", service);

    expect(createUser).toHaveBeenCalledTimes(1);
    const createArgs = createUser.mock.calls[0][0];
    expect(createArgs.email).toBe("nuevo@correo.com");
    expect(createArgs.email_confirm).toBe(true);
    expect(typeof createArgs.password).toBe("string");
    expect(createArgs.password.length).toBeGreaterThanOrEqual(6);

    // Role is left to the DB default ('user', D15): the insert never sets it.
    expect(profileInsert).toHaveBeenCalledWith({
      id: "new-uid",
      email: "nuevo@correo.com",
      first_name: null,
      last_name: null,
      must_change_password: true,
    });
    // The account and the handed-off password are the same secret.
    expect(result).toEqual({ success: true, created: true, tempPassword: createArgs.password });
  });

  // Case 2 — the email belongs to another platform app: createUser collides with
  // email_exists, and we refuse with a clear error, never adopting the account.
  it("rejects an email that exists on the platform but not in ecommerce", async () => {
    const createUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { code: "email_exists", status: 422, message: "email already exists" },
    });
    mockAuthAdmin(createUser);
    const { service, profileInsert } = mockEcommerceService(null);

    const result = await addStoreMember("store-1", "ajeno@correo.com", "owner", service);

    expect(result).toEqual({
      success: false,
      error: "Ese correo ya pertenece a una cuenta de la plataforma pero no del ecommerce. Usa otro correo.",
    });
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(profileInsert).not.toHaveBeenCalled();
  });

  // Case 3 — the email already uses ecommerce: reuse its id, never touch the
  // admin API. Its own password stands; must_change_password stays at its default.
  it("reuses an existing ecommerce profile without minting an account", async () => {
    const createUser = vi.fn();
    mockAuthAdmin(createUser);
    const { service, profileInsert } = mockEcommerceService("existing-uid");

    const result = await addStoreMember("store-1", "socio@correo.com", "admin", service);

    expect(result).toEqual({ success: true, created: false });
    expect(createUser).not.toHaveBeenCalled();
    expect(profileInsert).not.toHaveBeenCalled();
  });
});

describe("must_change_password profile flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockProfileRead(row: { must_change_password: boolean } | null, error: unknown = null) {
    const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    return { service: { from: vi.fn(() => ({ select })) }, select, eq };
  }

  it("reports a minted owner still on the temporary password", async () => {
    const { service, eq } = mockProfileRead({ must_change_password: true });

    await expect(requiresPasswordChange("owner-1", service)).resolves.toBe(true);
    expect(eq).toHaveBeenCalledWith("id", "owner-1");
  });

  it("reports no forced change for a user who set their own password", async () => {
    const { service } = mockProfileRead({ must_change_password: false });

    await expect(requiresPasswordChange("owner-2", service)).resolves.toBe(false);
  });

  it("clears the flag for the given user id and nobody else", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn(() => ({ eq }));
    const service = { from: vi.fn(() => ({ update })) };

    const result = await clearMustChangePassword("owner-1", service);

    expect(result).toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({ must_change_password: false });
    expect(eq).toHaveBeenCalledWith("id", "owner-1");
  });
});
