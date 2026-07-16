import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createServerClient, createClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  createClient: vi.fn(),
  cookies: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("next/headers", () => ({ cookies }));

import { POST } from "@/app/api/admin/home-discount-popup/upload/route";
import {
  ACTIVE_STORE_COOKIE,
  signActiveStore,
} from "@/lib/admin/active-store-cookie";

const COOKIE_STORE = "store-from-cookie";
const HOST_STORE = "store-from-host";
const HOST = "store-from-host.example.com";

function mockAuthenticatedUsers(
  sessionUserId: string | null,
  bearerUserId?: string,
) {
  createServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn(async (accessToken?: string) => ({
        data: {
          user: accessToken
            ? bearerUserId
              ? { id: bearerUserId }
              : null
            : sessionUserId
              ? { id: sessionUserId }
              : null,
        },
      })),
    },
  });

  cookies.mockResolvedValue({ get: vi.fn(), set: vi.fn() });
}

function mockSupabaseClients(manageableStoresByUser: Record<string, string[]>) {
  const storesLegacyChain: any = {
    select: vi.fn(() => storesLegacyChain),
    eq: vi.fn(() => storesLegacyChain),
    single: vi
      .fn()
      .mockResolvedValue({ data: { id: HOST_STORE }, error: null }),
  };

  const ecommerceSchema = {
    rpc: vi.fn(
      async (
        fnName: string,
        params: { p_user_id: string; p_store_id: string },
      ) => {
        if (fnName !== "can_user_manage_store") {
          throw new Error(`unexpected rpc ${fnName}`);
        }

        const manageable = manageableStoresByUser[params.p_user_id] ?? [];
        return { data: manageable.includes(params.p_store_id), error: null };
      },
    ),
    from: vi.fn((table: string) => {
      if (table !== "stores_legacy") {
        throw new Error(`unexpected table ${table}`);
      }

      return storesLegacyChain;
    }),
  };

  const upload = vi.fn().mockResolvedValue({ error: null });

  createClient.mockReturnValue({
    schema: vi.fn().mockReturnValue(ecommerceSchema),
    storage: {
      from: vi.fn(() => ({
        upload,
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: "https://cdn.example.com/banner.png" },
        })),
      })),
    },
  });

  return upload;
}

function makeUploadRequest(
  options: { activeStoreCookie?: string; bearerToken?: string } = {},
) {
  const headers = new Headers();
  headers.set("host", HOST);
  if (options.activeStoreCookie) {
    headers.set("cookie", `${ACTIVE_STORE_COOKIE}=${options.activeStoreCookie}`);
  }
  if (options.bearerToken) {
    headers.set("authorization", `Bearer ${options.bearerToken}`);
  }

  const request = new NextRequest(
    `http://${HOST}/api/admin/home-discount-popup/upload`,
    { method: "POST", headers },
  );

  const formData = new FormData();
  formData.append("file", new File(["banner"], "banner.png", { type: "image/png" }));
  vi.spyOn(request, "formData").mockResolvedValue(formData as any);

  return request;
}

function uploadedStoreFolder(upload: ReturnType<typeof mockSupabaseClients>) {
  const [objectPath] = upload.mock.calls[0];
  return String(objectPath).split("/")[1];
}

describe("home discount popup upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
    process.env.ADMIN_COOKIE_SECRET = "test-cookie-secret";
    delete process.env.DISABLE_SUBDOMAIN_MULTI_TENANT;
  });

  it("uploads to the active store folder instead of the host store folder", async () => {
    mockAuthenticatedUsers("admin-1");
    const upload = mockSupabaseClients({
      "admin-1": [COOKIE_STORE, HOST_STORE],
    });

    const response = await POST(
      makeUploadRequest({ activeStoreCookie: signActiveStore(COOKIE_STORE) }),
    );

    expect(response.status).toBe(200);
    expect(uploadedStoreFolder(upload)).toBe(COOKIE_STORE);
  });

  it("uploads for an admin of the active store who cannot manage the host store", async () => {
    mockAuthenticatedUsers("admin-1");
    const upload = mockSupabaseClients({ "admin-1": [COOKIE_STORE] });

    const response = await POST(
      makeUploadRequest({ activeStoreCookie: signActiveStore(COOKIE_STORE) }),
    );

    expect(response.status).toBe(200);
    expect(uploadedStoreFolder(upload)).toBe(COOKIE_STORE);
  });

  it("falls back to the host store when the signed active store is not manageable", async () => {
    mockAuthenticatedUsers("admin-1");
    const upload = mockSupabaseClients({ "admin-1": [HOST_STORE] });

    const response = await POST(
      makeUploadRequest({ activeStoreCookie: signActiveStore(COOKIE_STORE) }),
    );

    expect(response.status).toBe(200);
    expect(uploadedStoreFolder(upload)).toBe(HOST_STORE);
  });

  it("ignores a tampered active store cookie and uses the host store", async () => {
    mockAuthenticatedUsers("admin-1");
    const upload = mockSupabaseClients({
      "admin-1": [COOKIE_STORE, HOST_STORE],
    });

    const response = await POST(
      makeUploadRequest({ activeStoreCookie: `${COOKIE_STORE}.deadbeef` }),
    );

    expect(response.status).toBe(200);
    expect(uploadedStoreFolder(upload)).toBe(HOST_STORE);
  });

  it("uses the host store when no active store cookie is present", async () => {
    mockAuthenticatedUsers("admin-1");
    const upload = mockSupabaseClients({
      "admin-1": [COOKIE_STORE, HOST_STORE],
    });

    const response = await POST(makeUploadRequest());

    expect(response.status).toBe(200);
    expect(uploadedStoreFolder(upload)).toBe(HOST_STORE);
  });

  it("resolves the active store for the preview bearer identity", async () => {
    mockAuthenticatedUsers("admin-1", "preview-admin");
    const upload = mockSupabaseClients({ "preview-admin": [COOKIE_STORE] });

    const response = await POST(
      makeUploadRequest({
        activeStoreCookie: signActiveStore(COOKIE_STORE),
        bearerToken: "preview-token",
      }),
    );

    expect(response.status).toBe(200);
    expect(uploadedStoreFolder(upload)).toBe(COOKIE_STORE);
  });

  it("rejects an identity that manages no store before uploading", async () => {
    mockAuthenticatedUsers("admin-1");
    const upload = mockSupabaseClients({ "admin-1": [] });

    const response = await POST(makeUploadRequest());

    expect(response.status).toBe(403);
    expect(upload).not.toHaveBeenCalled();
  });
});
