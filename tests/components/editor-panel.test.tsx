import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { EditorPanel } from "@/components/admin/editor-panel";

const mockUseAdmin = vi.fn();
const mockUseStyles = vi.fn();
const mockUseStore = vi.fn();

vi.mock("@/contexts/admin-context", () => ({
  useAdmin: () => mockUseAdmin(),
}));

vi.mock("@/contexts/styles-context", () => ({
  useStyles: () => mockUseStyles(),
}));

vi.mock("@/contexts/store-context", () => ({
  useStore: () => mockUseStore(),
}));

vi.mock("@/lib/supabase/styles-api", () => ({
  updateComponentStyle: vi.fn(),
}));

vi.mock("@/lib/utils/store", () => ({
  getStoreId: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/admin/image-upload", () => ({
  ImageUpload: ({ label }: { label: string }) => <div>{label}</div>,
}));

describe("EditorPanel", () => {
  beforeEach(() => {
    mockUseStyles.mockReturnValue({
      styles: new Map(),
      refreshStyles: vi.fn(),
    });

    mockUseStore.mockReturnValue({
      store: { subdomain: "default" },
    });
  });

  it("shows clearer hero content guidance, including the new layout selector", () => {
    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    render(<EditorPanel />);

    expect(screen.getByText("Contenido del Componente")).toBeInTheDocument();
    expect(
      screen.getByText(/organizá el mensaje, los slides y el tipo de banner/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Diseño del Banner")).toBeInTheDocument();
  });

  it("routes rapid color edits through the scheduled update path", () => {
    const updateComponentEdit = vi.fn();
    const scheduleComponentEdit = vi.fn();

    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit,
      scheduleComponentEdit,
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    render(<EditorPanel />);
    const stylesTab = screen.getByRole("tab", { name: /estilos/i });
    fireEvent.mouseDown(stylesTab);
    fireEvent.click(stylesTab);

    const input = screen.getByLabelText("Color de Fondo");
    fireEvent.change(input, { target: { value: "#111111" } });
    fireEvent.change(input, { target: { value: "#222222" } });
    fireEvent.change(input, { target: { value: "#333333" } });

    expect(updateComponentEdit).not.toHaveBeenCalled();
    expect(scheduleComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "bgColor",
      "#333333",
    );
  });

  it("avoids eager css variable mutations while dragging color inputs", () => {
    const scheduleComponentEdit = vi.fn();
    const setPropertySpy = vi.spyOn(
      document.documentElement.style,
      "setProperty",
    );

    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit,
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    render(<EditorPanel />);
    const stylesTab = screen.getByRole("tab", { name: /estilos/i });
    fireEvent.mouseDown(stylesTab);
    fireEvent.click(stylesTab);

    const input = screen.getByLabelText("Color de Fondo");
    fireEvent.change(input, { target: { value: "#111111" } });
    fireEvent.change(input, { target: { value: "#222222" } });
    fireEvent.change(input, { target: { value: "#333333" } });

    expect(scheduleComponentEdit).toHaveBeenCalledTimes(3);
    expect(setPropertySpy).not.toHaveBeenCalled();
  });

  it("keeps text color drags on scheduled path without touching root styles", () => {
    const scheduleComponentEdit = vi.fn();
    const setPropertySpy = vi.spyOn(
      document.documentElement.style,
      "setProperty",
    );

    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit,
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    render(<EditorPanel />);
    const stylesTab = screen.getByRole("tab", { name: /estilos/i });
    fireEvent.mouseDown(stylesTab);
    fireEvent.click(stylesTab);

    const textColorInput = screen.getByLabelText("Color de Texto");
    fireEvent.change(textColorInput, { target: { value: "#a1a1a1" } });
    fireEvent.change(textColorInput, { target: { value: "#b2b2b2" } });

    expect(scheduleComponentEdit).toHaveBeenCalledTimes(2);
    expect(scheduleComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "textColor",
      "#b2b2b2",
    );
    expect(setPropertySpy).not.toHaveBeenCalled();
  });

  it("keeps site background color edits on the scheduled path without mutating body styles", () => {
    const updateComponentEdit = vi.fn();
    const scheduleComponentEdit = vi.fn();

    mockUseAdmin.mockReturnValue({
      selectedComponent: "site_background",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit,
      scheduleComponentEdit,
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    document.body.style.backgroundColor = "rgb(1, 2, 3)";

    render(<EditorPanel />);
    const stylesTab = screen.getByRole("tab", { name: /estilos/i });
    fireEvent.mouseDown(stylesTab);
    fireEvent.click(stylesTab);

    const input = screen.getByLabelText("Color de Fondo");
    fireEvent.change(input, { target: { value: "#abcdef" } });

    expect(updateComponentEdit).not.toHaveBeenCalled();
    expect(scheduleComponentEdit).toHaveBeenCalledWith(
      "site_background",
      "backgroundColor",
      "#abcdef",
    );
    expect(document.body.style.backgroundColor).toBe("rgb(1, 2, 3)");
  });

  it("does not eagerly touch body background when switching site background type", () => {
    const updateComponentEdit = vi.fn();

    mockUseStyles.mockReturnValue({
      styles: new Map([
        [
          "site_background",
          {
            type: "image",
            backgroundImage: "https://cdn.osoria.test/bg.jpg",
            backgroundColor: "#112233",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
          },
        ],
      ]),
      refreshStyles: vi.fn(),
    });

    mockUseAdmin.mockReturnValue({
      selectedComponent: "site_background",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit,
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    document.body.style.backgroundImage = "url(initial.jpg)";

    render(<EditorPanel />);
    const stylesTab = screen.getByRole("tab", { name: /estilos/i });
    fireEvent.mouseDown(stylesTab);
    fireEvent.click(stylesTab);

    const [typeSelector] = screen.getAllByRole("combobox");
    fireEvent.click(typeSelector);
    fireEvent.click(screen.getByRole("option", { name: "Color" }));

    expect(updateComponentEdit).toHaveBeenCalledWith(
      "site_background",
      "type",
      "color",
    );
    expect(document.body.style.backgroundImage).toBe('url("initial.jpg")');
  });

  it("renders only content tab panel by default", () => {
    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    render(<EditorPanel />);

    expect(screen.getByText("Contenido del Componente")).toBeInTheDocument();
    expect(
      screen.queryByText("Estilos del Componente"),
    ).not.toBeInTheDocument();
  });

  it("switches between tabs showing only the active panel", () => {
    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    render(<EditorPanel />);

    const stylesTab = screen.getByRole("tab", { name: /estilos/i });
    fireEvent.mouseDown(stylesTab);
    fireEvent.click(stylesTab);

    expect(screen.getByText("Estilos del Componente")).toBeInTheDocument();
    expect(
      screen.queryByText("Contenido del Componente"),
    ).not.toBeInTheDocument();
  });
});
