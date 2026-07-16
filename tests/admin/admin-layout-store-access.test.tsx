import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const { authorizeActiveStoreAdmin, listStoresForUser, requiresPasswordChange, redirect } =
  vi.hoisted(() => ({
    authorizeActiveStoreAdmin: vi.fn(),
    listStoresForUser: vi.fn(),
    requiresPasswordChange: vi.fn(),
    redirect: vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    }),
  }));

vi.mock("@/lib/supabase/active-store", () => ({ authorizeActiveStoreAdmin }));
vi.mock("@/lib/supabase/memberships-api", () => ({ listStoresForUser, requiresPasswordChange }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
vi.mock("@/components/admin/admin-auth-guard", () => ({
  AdminAuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/admin-active-store-context", () => ({
  AdminActiveStoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/admin/shell/admin-shell", () => ({
  AdminShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-shell">{children}</div>
  ),
}));

import AdminLayout from "@/app/admin/layout";

async function renderLayout() {
  const ui = await AdminLayout({ children: <div data-testid="admin-child">panel</div> });
  render(ui);
}

describe("app/admin layout store access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requiresPasswordChange.mockResolvedValue(false);
  });

  it("surfaces a clear message instead of an empty shell on a 403 denial", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 });

    await renderLayout();

    expect(screen.getByText("No administras esta tienda")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
    expect(listStoresForUser).not.toHaveBeenCalled();
  });

  it("renders the shell with the user's stores when authorized", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: {},
      storeId: "store-1",
      userId: "owner-1",
    });
    listStoresForUser.mockResolvedValue([
      { id: "store-1", store_name: "Tienda 1", subdomain: "tienda1" },
    ]);

    await renderLayout();

    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
    expect(screen.getByTestId("admin-child")).toBeInTheDocument();
    expect(screen.queryByText("No administras esta tienda")).not.toBeInTheDocument();
    expect(listStoresForUser).toHaveBeenCalledWith("owner-1");
  });

  it("forces a minted owner off the temporary password before any admin use", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: {},
      storeId: "store-1",
      userId: "owner-1",
    });
    requiresPasswordChange.mockResolvedValue(true);

    await expect(renderLayout()).rejects.toThrow("NEXT_REDIRECT");

    expect(requiresPasswordChange).toHaveBeenCalledWith("owner-1", {});
    expect(redirect).toHaveBeenCalledWith("/auth/force-password-change");
    expect(listStoresForUser).not.toHaveBeenCalled();
  });

  it("lets a user who set their own password into the panel", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({
      supabase: {},
      storeId: "store-1",
      userId: "owner-1",
    });
    requiresPasswordChange.mockResolvedValue(false);
    listStoresForUser.mockResolvedValue([]);

    await renderLayout();

    expect(redirect).not.toHaveBeenCalled();
    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
  });

  it("falls back to an empty shell on a 500 without hiding the panel", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Supabase no configurado", status: 500 });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderLayout();

    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
    expect(screen.queryByText("No administras esta tienda")).not.toBeInTheDocument();
    errorSpy.mockRestore();
  });
});
