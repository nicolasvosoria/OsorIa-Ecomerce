/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StoreProvider, useStore } from "@/contexts/store-context";

const NO_STORE = "sin tienda";

function StoreNameProbe() {
  const { store, isLoading } = useStore();
  if (isLoading) return <div>cargando</div>;
  return <div data-testid="store-name">{store?.store_name ?? NO_STORE}</div>;
}

const storeLookup = vi.fn(async () => ({ ok: false, json: async () => null }));

describe("StoreProvider on a subdomain with no store behind it", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", storeLookup);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the store empty instead of inventing one, and never asks for it", async () => {
    render(
      <StoreProvider isUnknownTenant>
        <StoreNameProbe />
      </StoreProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("store-name")).toHaveTextContent(NO_STORE),
    );
    expect(storeLookup).not.toHaveBeenCalled();
  });

  it("still falls back to the shared default store when the signal is absent", async () => {
    render(
      <StoreProvider>
        <StoreNameProbe />
      </StoreProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("store-name")).toHaveTextContent(
        "Tienda Principal",
      ),
    );
    expect(storeLookup).toHaveBeenCalled();
  });
});
