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
    updateComponentEdit,
    scheduleComponentEdit,
    flushScheduledEdits,
    clearComponentEdits,
    getComponentEditsSnapshot,
    selectedComponent,
    selectedHeroLayer,
    selectedHeroSlideIndex,
    selectedHeroHotspotId,
    selectComponent,
    setSelectedHeroLayer,
    setSelectedHeroSlideIndex,
    setSelectedHeroHotspotId,
    toggleEditMode,
  } = useAdmin();

  return (
    <div>
      <div data-testid="is-admin">{String(isAdmin)}</div>
      <div data-testid="selected-component">{selectedComponent ?? "none"}</div>
      <div data-testid="selected-hero-layer">
        {selectedHeroLayer ?? "none"}
      </div>
      <div data-testid="selected-hero-slide-index">
        {String(selectedHeroSlideIndex)}
      </div>
      <div data-testid="selected-hero-hotspot-id">
        {selectedHeroHotspotId ?? "none"}
      </div>
      <button onClick={() => toggleEditMode()}>toggle edit</button>
      <button onClick={() => selectComponent("hero")}>select hero</button>
      <button onClick={() => selectComponent("popular")}>select popular</button>
      <button onClick={() => selectComponent(null)}>clear selection</button>
      <button onClick={() => setSelectedHeroLayer("product")}>select layer</button>
      <button onClick={() => setSelectedHeroLayer("hotspots")}>select hotspots layer</button>
      <button onClick={() => setSelectedHeroSlideIndex(2)}>select slide</button>
      <button onClick={() => setSelectedHeroHotspotId("hotspot-1")}>select hotspot</button>
      <button
        onClick={() => {
          updateComponentEdit("hero", "bgColor", "#000000");
        }}
      >
        commit
      </button>
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
      <button onClick={() => clearComponentEdits("hero")}>clear</button>
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

  it("clears pending scheduled edits so discarded values cannot reappear later", async () => {
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

    fireEvent.click(screen.getByText("commit"));

    await waitFor(() => {
      expect(screen.getByTestId("edits")).toHaveTextContent("#000000");
    });

    vi.useFakeTimers();

    fireEvent.click(screen.getByText("second"));
    fireEvent.click(screen.getByText("clear"));

    expect(screen.getByTestId("edits")).toHaveTextContent("{}");
    expect(screen.getByTestId("snapshot")).toHaveTextContent("{}");

    await act(async () => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.getByTestId("edits")).toHaveTextContent("{}");
    expect(screen.getByTestId("snapshot")).toHaveTextContent("{}");
  });

  it("keeps selectedHeroLayer transient and outside component edit payloads", async () => {
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("toggle edit"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select layer"));
    });

    expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    expect(screen.getByTestId("selected-hero-layer")).toHaveTextContent(
      "product",
    );
    expect(screen.getByTestId("edits")).toHaveTextContent("{}");
    expect(screen.getByTestId("snapshot")).not.toHaveTextContent(
      "selectedHeroLayer",
    );
  });

  it("resets selectedHeroLayer when hero selection clears or edit mode closes", async () => {
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("toggle edit"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select layer"));
    });

    expect(screen.getByTestId("selected-hero-layer")).toHaveTextContent(
      "product",
    );

    await act(async () => {
      fireEvent.click(screen.getByText("select popular"));
    });
    expect(screen.getByTestId("selected-component")).toHaveTextContent(
      "popular",
    );
    expect(screen.getByTestId("selected-hero-layer")).toHaveTextContent(
      "none",
    );

    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select layer"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("clear selection"));
    });
    expect(screen.getByTestId("selected-hero-layer")).toHaveTextContent(
      "none",
    );

    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select layer"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("toggle edit"));
    });
    expect(screen.getByTestId("selected-component")).toHaveTextContent("none");
    expect(screen.getByTestId("selected-hero-layer")).toHaveTextContent(
      "none",
    );
  });

  it("keeps selectedHeroSlideIndex and selectedHeroHotspotId transient and outside edit payloads", async () => {
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("toggle edit"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select slide"));
      fireEvent.click(screen.getByText("select hotspots layer"));
      fireEvent.click(screen.getByText("select hotspot"));
    });

    expect(screen.getByTestId("selected-hero-slide-index")).toHaveTextContent("2");
    expect(screen.getByTestId("selected-hero-hotspot-id")).toHaveTextContent(
      "hotspot-1",
    );
    expect(screen.getByTestId("edits")).toHaveTextContent("{}");
    expect(screen.getByTestId("snapshot")).not.toHaveTextContent(
      "selectedHeroSlideIndex",
    );
    expect(screen.getByTestId("snapshot")).not.toHaveTextContent(
      "selectedHeroHotspotId",
    );
  });

  it("resets slide and hotspot selection on component switch, hero deselect and edit mode close", async () => {
    render(
      <AdminProvider>
        <Harness />
      </AdminProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("is-admin")).toHaveTextContent("true");
    });

    await act(async () => {
      fireEvent.click(screen.getByText("toggle edit"));
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select slide"));
      fireEvent.click(screen.getByText("select hotspot"));
    });

    expect(screen.getByTestId("selected-hero-slide-index")).toHaveTextContent("2");
    expect(screen.getByTestId("selected-hero-hotspot-id")).toHaveTextContent(
      "hotspot-1",
    );

    await act(async () => {
      fireEvent.click(screen.getByText("select popular"));
    });
    expect(screen.getByTestId("selected-hero-slide-index")).toHaveTextContent("0");
    expect(screen.getByTestId("selected-hero-hotspot-id")).toHaveTextContent(
      "none",
    );

    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select slide"));
      fireEvent.click(screen.getByText("select hotspot"));
      fireEvent.click(screen.getByText("clear selection"));
    });
    expect(screen.getByTestId("selected-hero-slide-index")).toHaveTextContent("0");
    expect(screen.getByTestId("selected-hero-hotspot-id")).toHaveTextContent(
      "none",
    );

    await act(async () => {
      fireEvent.click(screen.getByText("select hero"));
    });
    await waitFor(() => {
      expect(screen.getByTestId("selected-component")).toHaveTextContent("hero");
    });
    await act(async () => {
      fireEvent.click(screen.getByText("select slide"));
      fireEvent.click(screen.getByText("select hotspot"));
      fireEvent.click(screen.getByText("toggle edit"));
    });
    expect(screen.getByTestId("selected-hero-slide-index")).toHaveTextContent("0");
    expect(screen.getByTestId("selected-hero-hotspot-id")).toHaveTextContent(
      "none",
    );
  });
});
