import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { useState } from "react";
import { AdminProvider, useAdmin } from "@/contexts/admin-context";

const mockIsCurrentUserAdmin = vi.fn();

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: "admin-1" },
  }),
}));

vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdmin: () => mockIsCurrentUserAdmin(),
}));

function Harness() {
  const [, setRenderTick] = useState(0);
  const {
    isAdmin,
    componentEdits,
    scheduleComponentEdit,
    flushScheduledEdits,
    getComponentEditsSnapshot,
  } = useAdmin();

  return (
    <div>
      <div data-testid="is-admin">{String(isAdmin)}</div>
      <button
        onClick={() => {
          scheduleComponentEdit("hero", "bgColor", "#111111", 120);
          setRenderTick((value) => value + 1);
        }}
      >
        first
      </button>
      <button
        onClick={() => {
          scheduleComponentEdit("hero", "bgColor", "#222222", 120);
          setRenderTick((value) => value + 1);
        }}
      >
        second
      </button>
      <button onClick={() => flushScheduledEdits("hero")}>flush</button>
      <pre data-testid="snapshot">
        {JSON.stringify(getComponentEditsSnapshot("hero"))}
      </pre>
      <pre data-testid="edits">
        {JSON.stringify(Object.fromEntries(componentEdits))}
      </pre>
    </div>
  );
}

describe("AdminProvider", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mockIsCurrentUserAdmin.mockResolvedValue(true);
  });

  it("batches rapid scheduled edits into a single committed value", async () => {
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    fireEvent.click(screen.getByText("first"));
    fireEvent.click(screen.getByText("second"));

    expect(screen.getByTestId("edits")).toHaveTextContent("{}");

    await waitFor(
      () => {
        expect(screen.getByTestId("edits")).toHaveTextContent("#222222");
      },
      { timeout: 1000 },
    );
  });

  it("can flush scheduled edits before the debounce window finishes", async () => {
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    fireEvent.click(screen.getByText("second"));
    fireEvent.click(screen.getByText("flush"));

    await waitFor(
      () => {
        expect(screen.getByTestId("edits")).toHaveTextContent("#222222");
      },
      { timeout: 1000 },
    );
  });

  it("exposes pending scheduled edits in the snapshot before they flush", async () => {
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    fireEvent.click(screen.getByText("first"));

    expect(screen.getByTestId("edits")).toHaveTextContent("{}");
    expect(screen.getByTestId("snapshot")).toHaveTextContent("#111111");
  });
});
