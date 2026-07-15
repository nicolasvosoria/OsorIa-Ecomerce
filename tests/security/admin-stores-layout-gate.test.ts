import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authorizeSuperAdmin, redirect } = vi.hoisted(() => ({
  authorizeSuperAdmin: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/active-store", () => ({ authorizeSuperAdmin }));
vi.mock("next/navigation", () => ({ redirect }));

import StoresLayout from "@/app/admin/stores/layout";

describe("app/admin/stores layout gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a non-super_admin to /admin instead of exposing the tenant console", async () => {
    authorizeSuperAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 });

    await StoresLayout({ children: "tenant console" as unknown as React.ReactNode });

    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("redirects an unauthenticated visitor to /admin", async () => {
    authorizeSuperAdmin.mockResolvedValue({ error: "Acceso denegado", status: 401 });

    await StoresLayout({ children: "tenant console" as unknown as React.ReactNode });

    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("renders children without redirecting for an authorized super_admin", async () => {
    authorizeSuperAdmin.mockResolvedValue({ supabase: {}, userId: "super-1" });

    const result = await StoresLayout({ children: "tenant console" as unknown as React.ReactNode });

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
