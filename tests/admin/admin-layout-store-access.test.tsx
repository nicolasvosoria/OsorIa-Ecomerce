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
  AdminShell: ({
    children,
    servingState,
  }: {
    children: React.ReactNode;
    servingState: string | null;
  }) => (
    <div data-testid="admin-shell" data-serving-state={servingState ?? "sin-resolver"}>
      {children}
    </div>
  ),
}));

import AdminLayout from "@/app/admin/layout";

type StoreLifecycleRow = { is_active: boolean; is_public: boolean } | null;

// Stub del cliente ya autorizado: expone las llamadas encadenadas para poder
// afirmar CON QUÉ tienda se leyó el estado, no solo qué se pintó.
function createStoreReader(row: StoreLifecycleRow, error: unknown = null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: row, error });
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));

  return { supabase: { from }, from, select, eq };
}

const LIVE_STORE: StoreLifecycleRow = { is_active: true, is_public: true };

function authorizeWith(supabase: unknown) {
  authorizeActiveStoreAdmin.mockResolvedValue({ supabase, storeId: "store-1", userId: "owner-1" });
}

async function renderLayout() {
  const ui = await AdminLayout({ children: <div data-testid="admin-child">panel</div> });
  render(ui);
}

describe("app/admin layout store access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requiresPasswordChange.mockResolvedValue(false);
    listStoresForUser.mockResolvedValue([]);
  });

  it("surfaces a clear message instead of an empty shell on a 403 denial", async () => {
    authorizeActiveStoreAdmin.mockResolvedValue({ error: "Acceso denegado", status: 403 });

    await renderLayout();

    expect(screen.getByText("No administras esta tienda")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
    expect(listStoresForUser).not.toHaveBeenCalled();
  });

  it("renders the shell with the user's stores when authorized", async () => {
    authorizeWith(createStoreReader(LIVE_STORE).supabase);
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
    const reader = createStoreReader(LIVE_STORE);
    authorizeWith(reader.supabase);
    requiresPasswordChange.mockResolvedValue(true);

    await expect(renderLayout()).rejects.toThrow("NEXT_REDIRECT");

    expect(requiresPasswordChange).toHaveBeenCalledWith("owner-1", reader.supabase);
    expect(redirect).toHaveBeenCalledWith("/auth/force-password-change");
    expect(listStoresForUser).not.toHaveBeenCalled();
  });

  it("lets a user who set their own password into the panel", async () => {
    authorizeWith(createStoreReader(LIVE_STORE).supabase);

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

describe("app/admin layout serving state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requiresPasswordChange.mockResolvedValue(false);
    listStoresForUser.mockResolvedValue([]);
  });

  it("reads the flags of the authorized active store, never of a client-supplied id", async () => {
    const reader = createStoreReader({ is_active: true, is_public: false });
    authorizeWith(reader.supabase);

    await renderLayout();

    expect(reader.from).toHaveBeenCalledWith("stores");
    expect(reader.select).toHaveBeenCalledWith("is_active, is_public");
    expect(reader.eq).toHaveBeenCalledWith("id", "store-1");
  });

  it("hands the shell an unpublished state when the owner has not published yet", async () => {
    authorizeWith(createStoreReader({ is_active: true, is_public: false }).supabase);

    await renderLayout();

    expect(screen.getByTestId("admin-shell")).toHaveAttribute("data-serving-state", "unpublished");
  });

  // Una tienda suspendida nace además sin publicar: si la publicación ganara, el
  // dueño vería el mensaje que lo manda al único control que no la reactiva.
  it("hands the shell a suspended state even when the store is also unpublished", async () => {
    authorizeWith(createStoreReader({ is_active: false, is_public: false }).supabase);

    await renderLayout();

    expect(screen.getByTestId("admin-shell")).toHaveAttribute("data-serving-state", "suspended");
  });

  it("hands the shell a live state when both flags hold", async () => {
    authorizeWith(createStoreReader(LIVE_STORE).supabase);

    await renderLayout();

    expect(screen.getByTestId("admin-shell")).toHaveAttribute("data-serving-state", "live");
  });

  it("leaves the state unresolved instead of guessing when the store cannot be read", async () => {
    authorizeWith(createStoreReader(null, { message: "boom" }).supabase);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await renderLayout();

    expect(screen.getByTestId("admin-shell")).toHaveAttribute("data-serving-state", "sin-resolver");
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
