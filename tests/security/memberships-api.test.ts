import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({ createClient }));

import { listStoresForUser, upsertMembershipRole } from "@/lib/supabase/memberships-api";

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
