import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
const {
  resolveAuthIdentityByEmail,
  inviteNewIdentity,
  mintPendingMembershipInvite,
  provisionOrCompensate,
  loadStoreIdentity,
  toTenantEmailBranding,
} = vi.hoisted(() => ({
  resolveAuthIdentityByEmail: vi.fn(),
  inviteNewIdentity: vi.fn(),
  mintPendingMembershipInvite: vi.fn(),
  provisionOrCompensate: vi.fn(),
  loadStoreIdentity: vi.fn(),
  toTenantEmailBranding: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("@/lib/auth/platform-identity-invites", () => ({
  resolveAuthIdentityByEmail,
  inviteNewIdentity,
  mintPendingMembershipInvite,
  provisionOrCompensate,
}));
vi.mock("@/lib/supabase/store-identity-api", () => ({ loadStoreIdentity, toTenantEmailBranding }));

import {
  addStoreMember,
  clearMustChangePassword,
  grantSupportMembership,
  listStoreMembers,
  listStoresForUser,
  removeMembership,
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

  // Membership is the only path: the global role is never consulted, so a
  // super_admin with no memberships manages no store (D3/D5).
  it("gives a super_admin without memberships no stores instead of every store", async () => {
    const { from } = mockService({
      store_users: { data: [] },
    });

    const stores = await listStoresForUser("super-admin-1");

    expect(stores).toEqual([]);
    expect(from).not.toHaveBeenCalledWith("user_profiles");
    expect(from).not.toHaveBeenCalledWith("stores");
  });

  it("lists only the stores where the user holds a managing membership", async () => {
    const memberStores = [{ id: "store-b", store_name: "B", subdomain: "b" }];
    const { chains } = mockService({
      store_users: {
        data: [{ store_id: "store-b", store_user_roles: [{ roles: { role_name: "owner" } }] }],
      },
      stores: { data: memberStores },
    });

    const stores = await listStoresForUser("member-1");

    expect(stores).toEqual(memberStores);
    expect(chains.store_users.select).toHaveBeenCalledWith(
      "store_id, store_user_roles(roles(role_name))",
    );
    expect(chains.store_users.eq).toHaveBeenCalledWith("user_id", "member-1");
    expect(chains.stores.in).toHaveBeenCalledWith("id", ["store-b"]);
  });

  // Mirrors ecommerce.can_user_manage_store: a store_users row without an
  // 'owner'/'admin' role link grants nothing.
  it("does not count memberships without a managing role", async () => {
    const { from } = mockService({
      store_users: {
        data: [
          { store_id: "store-c", store_user_roles: [] },
          { store_id: "store-d", store_user_roles: null },
          { store_id: "store-e", store_user_roles: [{ roles: { role_name: "viewer" } }] },
        ],
      },
    });

    const stores = await listStoresForUser("member-2");

    expect(stores).toEqual([]);
    expect(from).not.toHaveBeenCalledWith("stores");
  });

  it("returns no stores without querying stores when the user has no memberships", async () => {
    const { from } = mockService({
      store_users: { data: [] },
    });

    const stores = await listStoresForUser("member-3");

    expect(stores).toEqual([]);
    expect(from).not.toHaveBeenCalledWith("stores");
  });

  // The support self-grant mints an 'admin' membership (A1): the same join that
  // mirrors can_user_manage_store must count it, or "Entrar a tienda" stays dead.
  it("counts a support membership ('admin' role) as a managed store", async () => {
    const supportStore = [{ id: "store-s", store_name: "Soporte", subdomain: "soporte" }];
    const { chains } = mockService({
      store_users: {
        data: [{ store_id: "store-s", store_user_roles: [{ roles: { role_name: "admin" } }] }],
      },
      stores: { data: supportStore },
    });

    const stores = await listStoresForUser("super-1");

    expect(stores).toEqual(supportStore);
    expect(chains.stores.in).toHaveBeenCalledWith("id", ["store-s"]);
  });
});

describe("grantSupportMembership (super_admin self-grant, D2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function mockSupportGrantService(existingMembershipId: string | null) {
    const membershipInsert = vi.fn(() => ({
      select: () => ({ single: async () => ({ data: { id: "su-9" }, error: null }) }),
    }));
    const roleQueryFilters: unknown[][] = [];
    const roleLinkInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === "store_users") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: existingMembershipId ? { id: existingMembershipId } : null,
                  error: null,
                }),
              }),
            }),
          }),
          insert: membershipInsert,
        };
      }
      if (table === "roles") {
        return {
          select: () => ({
            eq: (...first: unknown[]) => {
              roleQueryFilters.push(first);
              return {
                eq: (...second: unknown[]) => {
                  roleQueryFilters.push(second);
                  return {
                    maybeSingle: async () => ({ data: { id: "role-admin" }, error: null }),
                  };
                },
              };
            },
          }),
        };
      }
      if (table === "store_user_roles") {
        return {
          delete: () => ({ eq: vi.fn().mockResolvedValue({ error: null }) }),
          insert: roleLinkInsert,
        };
      }
      throw new Error(`unexpected table ${table}`);
    });

    return { service: { from }, membershipInsert, roleLinkInsert, roleQueryFilters };
  }

  it("creates the membership with granted_by = the actor and the 'admin' store role (A1)", async () => {
    const { service, membershipInsert, roleLinkInsert, roleQueryFilters } =
      mockSupportGrantService(null);

    const result = await grantSupportMembership("store-1", "super-1", service);

    expect(result).toEqual({ success: true });
    expect(membershipInsert).toHaveBeenCalledWith({
      store_id: "store-1",
      user_id: "super-1",
      granted_by: "super-1",
    });
    expect(roleQueryFilters).toContainEqual(["role_name", "admin"]);
    expect(roleLinkInsert).toHaveBeenCalledWith({ store_user_id: "su-9", role_id: "role-admin" });
  });

  // Idempotent: re-granting to someone already on the team changes nothing — an
  // 'owner' membership is never downgraded and no duplicate row appears.
  it("leaves an existing membership and its role untouched", async () => {
    const { service, membershipInsert, roleLinkInsert } = mockSupportGrantService("su-1");

    const result = await grantSupportMembership("store-1", "super-1", service);

    expect(result).toEqual({ success: true });
    expect(membershipInsert).not.toHaveBeenCalled();
    expect(roleLinkInsert).not.toHaveBeenCalled();
  });

  it("surfaces the underlying failure instead of granting blind", async () => {
    const service = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: { message: "permission denied" } }),
            }),
          }),
        }),
      })),
    };

    const result = await grantSupportMembership("store-1", "super-1", service);

    expect(result).toEqual({ success: false, error: "permission denied" });
  });
});

describe("listStoreMembers support signal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  });

  // Only the support self-grant writes granted_by today (D2), so its presence is
  // the honest signal the owner's team table labels as "Acceso de soporte".
  it("selects granted_by and marks only those rows as support access", async () => {
    const { chains } = mockService({
      store_users: {
        data: [
          {
            user_id: "super-1",
            granted_by: "super-1",
            user_profiles: { email: "soporte@osoria.tech", first_name: "Sole", last_name: "Soporte" },
            store_user_roles: [{ roles: { role_name: "admin" } }],
          },
          {
            user_id: "owner-1",
            granted_by: null,
            user_profiles: { email: "duena@correo.com", first_name: "Ana", last_name: "Pérez" },
            store_user_roles: [{ roles: { role_name: "owner" } }],
          },
        ],
      },
    });

    const members = await listStoreMembers("store-1");

    expect(chains.store_users.select).toHaveBeenCalledWith(
      "user_id, granted_by, user_profiles(email, first_name, last_name), store_user_roles(roles(role_name))",
    );
    expect(members).toEqual([
      expect.objectContaining({ userId: "super-1", role: "admin", isSupportAccess: true }),
      expect.objectContaining({ userId: "owner-1", role: "owner", isSupportAccess: false }),
    ]);
  });
});

describe("removeMembership on a support-granted row", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // D2: the owner revokes support access like any other membership — the deletes
  // key on the membership id alone, granted_by never filters the row out.
  it("drops the role links and the membership row", async () => {
    const roleLinkDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const membershipDeleteFilters: unknown[][] = [];
    const service = {
      from: vi.fn((table: string) => {
        if (table === "store_users") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: async () => ({ data: { id: "su-9" }, error: null }) }),
              }),
            }),
            delete: () => ({
              eq: (...first: unknown[]) => {
                membershipDeleteFilters.push(first);
                return {
                  eq: async (...second: unknown[]) => {
                    membershipDeleteFilters.push(second);
                    return { error: null };
                  },
                };
              },
            }),
          };
        }
        if (table === "store_user_roles") {
          return { delete: () => ({ eq: roleLinkDeleteEq }) };
        }
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await removeMembership("store-1", "super-1", service);

    expect(result).toEqual({ success: true });
    expect(roleLinkDeleteEq).toHaveBeenCalledWith("store_user_id", "su-9");
    expect(membershipDeleteFilters).toEqual([
      ["id", "su-9"],
      ["store_id", "store-1"],
    ]);
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

describe("addStoreMember (D20/D21)", () => {
  const STORE_ID = "store-1";
  const ACTOR_ID = "owner-1";

  // Ecommerce service the action passes in: happy-path stubs for the
  // store_users lookup/insert and role write, keyed generically since
  // resolveAuthIdentityByEmail (mocked, see below) is now what decides
  // whether an identity exists at all -- this file no longer calls the real
  // user_profiles.ilike lookup for that.
  function mockEcommerceService(existingStoreUserId: string | null) {
    const profileInsert = vi.fn().mockResolvedValue({ error: null });
    const from = vi.fn((table: string) => {
      if (table === "user_profiles") {
        return { insert: profileInsert };
      }
      if (table === "store_users") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: existingStoreUserId ? { id: existingStoreUserId } : null,
                  error: null,
                }),
              }),
            }),
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
    provisionOrCompensate.mockImplementation((_userId: string, provision: () => Promise<unknown>) => provision());
    loadStoreIdentity.mockResolvedValue({ subdomain: "cumbre-dorada" });
    toTenantEmailBranding.mockReturnValue({ displayName: "Cumbre Dorada", validatedSubdomain: "cumbre-dorada", primaryColor: "", commercialAddress: "" });
  });

  // Case 1 (D20) — an email unknown ANYWHERE in this shared-pool project is
  // invited natively and gains membership immediately: nobody could have
  // been hijacked, since nobody used that email before.
  it("invites an unknown email natively and provisions membership immediately", async () => {
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: false });
    inviteNewIdentity.mockResolvedValue({ outcome: "invited", userId: "new-uid" });
    const { service, profileInsert } = mockEcommerceService(null);

    const result = await addStoreMember(STORE_ID, ACTOR_ID, "  NUEVO@Correo.com ", "admin", service);

    expect(resolveAuthIdentityByEmail).toHaveBeenCalledWith(service, "nuevo@correo.com");
    expect(inviteNewIdentity).toHaveBeenCalledWith(service, {
      storeId: STORE_ID,
      subdomain: "cumbre-dorada",
      email: "nuevo@correo.com",
      purpose: "new_user_invite",
    });
    expect(provisionOrCompensate).toHaveBeenCalledWith("new-uid", expect.any(Function));
    // No must_change_password (D22's app_metadata flag replaces it for this path).
    expect(profileInsert).toHaveBeenCalledWith({
      id: "new-uid",
      email: "nuevo@correo.com",
      first_name: null,
      last_name: null,
    });
    expect(result).toEqual({ success: true, outcome: "invited" });
  });

  // Case 2 (D21) — the email already exists somewhere in the org (this
  // app's ecommerce.user_profiles or a different app's own identity, both
  // resolved the same way by resolveAuthIdentityByEmail) but is not yet a
  // member of THIS store: a pending acceptance, never an immediate grant.
  it("mints a pending membership invite for an identity that exists but is not yet a member of this store", async () => {
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: true, userId: "existing-uid" });
    mintPendingMembershipInvite.mockResolvedValue({ outcome: "invited" });
    const { service } = mockEcommerceService(null);

    const result = await addStoreMember(STORE_ID, ACTOR_ID, "socio@correo.com", "admin", service);

    expect(loadStoreIdentity).toHaveBeenCalledWith(service, STORE_ID);
    expect(mintPendingMembershipInvite).toHaveBeenCalledWith(service, expect.objectContaining({
      actorUserId: ACTOR_ID,
      storeId: STORE_ID,
      intendedUserId: "existing-uid",
      email: "socio@correo.com",
      roleName: "admin",
    }));
    expect(inviteNewIdentity).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, outcome: "pending_acceptance" });
  });

  // Case 3 — already a member of THIS exact store: same as before slice 6,
  // just a role replacement, no invite of any kind.
  it("replaces the role of an identity already on this store's team, without inviting anyone", async () => {
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: true, userId: "existing-uid" });
    const { service } = mockEcommerceService("su-existing");

    const result = await addStoreMember(STORE_ID, ACTOR_ID, "socio@correo.com", "owner", service);

    expect(result).toEqual({ success: true, outcome: "role_updated" });
    expect(mintPendingMembershipInvite).not.toHaveBeenCalled();
    expect(inviteNewIdentity).not.toHaveBeenCalled();
  });

  it("surfaces a rate-limited native invite as a friendly Spanish message", async () => {
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: false });
    inviteNewIdentity.mockResolvedValue({ outcome: "rate_limited" });
    const { service } = mockEcommerceService(null);

    const result = await addStoreMember(STORE_ID, ACTOR_ID, "nuevo@correo.com", "admin", service);

    expect(result).toEqual({
      success: false,
      error: "Ya enviamos una invitación hace poco. Espera un momento antes de volver a intentarlo.",
    });
  });

  // The compensation verify criterion's "already existed" direction, at the
  // addStoreMember assembly level: an identity resolveAuthIdentityByEmail
  // found pre-existing is NEVER passed to provisionOrCompensate at all.
  it("never routes a pre-existing identity through provisionOrCompensate", async () => {
    resolveAuthIdentityByEmail.mockResolvedValue({ exists: true, userId: "existing-uid" });
    mintPendingMembershipInvite.mockResolvedValue({ outcome: "invited" });
    const { service } = mockEcommerceService(null);

    await addStoreMember(STORE_ID, ACTOR_ID, "socio@correo.com", "admin", service);

    expect(provisionOrCompensate).not.toHaveBeenCalled();
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
