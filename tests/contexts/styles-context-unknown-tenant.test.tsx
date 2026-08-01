/** @vitest-environment jsdom */

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  StylesProvider,
  useComponentStyle,
  useStyles,
} from "@/contexts/styles-context";
import {
  getComponentStyles,
  subscribeToStyleChanges,
} from "@/lib/supabase/styles-api";

vi.mock("@/lib/supabase/styles-api", () => ({
  getComponentStyles: vi.fn(async () => []),
  subscribeToStyleChanges: vi.fn(async () => ({ unsubscribe: vi.fn() })),
}));

function ComponentStyleProbe() {
  const { loading } = useStyles();
  useComponentStyle("header");
  return <div>{loading ? "cargando" : "listo"}</div>;
}

describe("StylesProvider on a subdomain with no store behind it", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("asks Supabase for no component styles and opens no realtime channel", async () => {
    render(
      <StylesProvider isUnknownTenant>
        <ComponentStyleProbe />
      </StylesProvider>,
    );

    await waitFor(() => expect(screen.getByText("listo")).toBeInTheDocument());

    expect(getComponentStyles).not.toHaveBeenCalled();
    expect(subscribeToStyleChanges).not.toHaveBeenCalled();
  });

  it("still loads and subscribes when the signal is absent", async () => {
    render(
      <StylesProvider>
        <ComponentStyleProbe />
      </StylesProvider>,
    );

    await waitFor(() => expect(getComponentStyles).toHaveBeenCalled());
    expect(subscribeToStyleChanges).toHaveBeenCalledWith(
      "header",
      expect.any(Function),
    );
  });
});
