/** @vitest-environment jsdom */

import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModeProvider, useMode } from "@/contexts/mode-context";
import { DEFAULT_DARK_FALLBACK } from "@/lib/theme-font/theme-definition";
import { DEFAULT_RUNTIME_THEME } from "@/lib/theme-font/runtime-contract";

function mockMatchMedia(matches: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_event: string, listener: any) => listeners.add(listener),
    removeEventListener: (_event: string, listener: any) => listeners.delete(listener),
    dispatchEvent: vi.fn(),
  }) as unknown as MediaQueryList);
  return {
    fire: (nextMatches: boolean) => {
      listeners.forEach((listener) =>
        listener({ matches: nextMatches } as MediaQueryListEvent),
      );
    },
  };
}

function Probe() {
  const { mode, isDark } = useMode();
  return (
    <div>
      <div data-testid="mode">{mode}</div>
      <div data-testid="is-dark">{String(isDark)}</div>
    </div>
  );
}

describe("ModeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");
  });

  it("defaults to the light preference and keeps the dark class off", async () => {
    mockMatchMedia(false);

    render(
      <ModeProvider>
        <Probe />
      </ModeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("mode")).toHaveTextContent("light"));
    expect(screen.getByTestId("is-dark")).toHaveTextContent("false");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("resolves a 'system' preference via matchMedia and reacts to changes", async () => {
    localStorage.setItem("osoria_mode", "system");
    const media = mockMatchMedia(true);

    render(
      <ModeProvider>
        <Probe />
      </ModeProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("is-dark")).toHaveTextContent("true"));
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => media.fire(false));

    await waitFor(() => expect(screen.getByTestId("is-dark")).toHaveTextContent("false"));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("persists an explicit preference and applies the dark color set", async () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    await waitFor(() => expect(result.current.mode).toBe("light"));

    act(() => result.current.setMode("dark"));

    expect(localStorage.getItem("osoria_mode")).toBe("dark");
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(
      document.documentElement.style.getPropertyValue("--foreground"),
    ).toBe(DEFAULT_DARK_FALLBACK.foreground);
  });

  it("re-applies the light color set when switching back", async () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMode(), {
      wrapper: ModeProvider,
    });

    await waitFor(() => expect(result.current.mode).toBe("light"));

    act(() => result.current.setMode("dark"));
    act(() => result.current.setMode("light"));

    expect(localStorage.getItem("osoria_mode")).toBe("light");
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue("--foreground"),
    ).toBe(DEFAULT_RUNTIME_THEME.colors.foreground);
  });

  it("throws when useMode is used outside a ModeProvider", () => {
    expect(() => renderHook(() => useMode())).toThrow(
      "useMode must be used within a ModeProvider",
    );
  });
});
