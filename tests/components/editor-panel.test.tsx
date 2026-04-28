import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditorPanel } from "@/components/admin/editor-panel";
import { updateComponentStyle } from "@/lib/supabase/styles-api";

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

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseEcommerce: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: { id: "default-store" } }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/contract", () => ({
  ECOMMERCE_VIEWS: {
    storesLegacy: "stores",
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/components/admin/image-upload", () => ({
  ImageUpload: ({ label }: { label: string }) => (
    <label>
      {label}
      <input aria-label={label} readOnly />
    </label>
  ),
}));

describe("EditorPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseStyles.mockReturnValue({
      styles: new Map(),
      refreshStyles: vi.fn(),
    });

    mockUseStore.mockReturnValue({
      store: { subdomain: "default" },
    });
  });

  const heroAdminState = (overrides: Record<string, any> = {}) => ({
    selectedComponent: "hero",
    selectComponent: vi.fn(),
    selectedHeroLayer: "background",
    setSelectedHeroLayer: vi.fn(),
    selectedHeroSlideIndex: 0,
    setSelectedHeroSlideIndex: vi.fn(),
    selectedHeroHotspotId: null,
    setSelectedHeroHotspotId: vi.fn(),
    componentEdits: new Map(),
    updateComponentEdit: vi.fn(),
    scheduleComponentEdit: vi.fn(),
    flushScheduledEdits: vi.fn(),
    clearComponentEdits: vi.fn(),
    getComponentEditsSnapshot: vi.fn(() => ({})),
    isEditMode: true,
    toggleEditMode: vi.fn(),
    ...overrides,
  });

  it("renders Hero as a single semantic hierarchy panel without content/style tabs", () => {
    const setSelectedHeroLayer = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "background",
      setSelectedHeroLayer,
    }));

    render(<EditorPanel />);

    expect(screen.getByText("Editor del Hero")).toBeInTheDocument();
    expect(screen.getByLabelText("Tipo de banner")).toBeInTheDocument();
    expect(screen.getByText("Gestión de slides")).toBeInTheDocument();
    expect(screen.getByLabelText("Slide activo")).toBeInTheDocument();
    expect(screen.getByLabelText("Componente del slide")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Background" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Product" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /contenido/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /estilos/i })).not.toBeInTheDocument();
  });

  it("orders Hero controls as banner type, slide management, component selector and contextual controls", () => {
    mockUseAdmin.mockReturnValue(heroAdminState());

    render(<EditorPanel />);

    const panelText = screen.getByText("Tipo de banner").closest("div")?.parentElement;
    const bannerType = screen.getByText("Tipo de banner");
    const slideManagement = screen.getByText("Gestión de slides");
    const componentSelect = screen.getByText("Componente del slide");
    const backgroundControl = screen.getByLabelText("Imagen de fondo");

    expect(panelText).toBeTruthy();
    expect(
      bannerType.compareDocumentPosition(slideManagement) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      slideManagement.compareDocumentPosition(componentSelect) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      componentSelect.compareDocumentPosition(backgroundControl) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("selects Hero layers with keyboard-operable buttons and shows contextual controls", () => {
    const setSelectedHeroLayer = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "background",
      setSelectedHeroLayer,
    }));

    render(<EditorPanel />);

    expect(screen.getByLabelText("Imagen de fondo")).toBeInTheDocument();
    expect(screen.getByText("Enfoque horizontal")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Componente del slide"));
    fireEvent.click(screen.getByRole("option", { name: "Producto" }));

    expect(setSelectedHeroLayer).toHaveBeenCalledWith("product");
  });

  it("opens the slide component dropdown from the keyboard", async () => {
    const user = userEvent.setup();
    const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "background",
    }));

    try {
      render(<EditorPanel />);

      const componentSelect = screen.getByLabelText("Componente del slide");
      componentSelect.focus();
      expect(componentSelect).toHaveFocus();

      await user.keyboard("[ArrowDown]");

      expect(screen.getByRole("option", { name: "Producto" })).toBeInTheDocument();
      expect(componentSelect).toHaveAttribute("aria-expanded", "true");
    } finally {
      HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    }
  });

  it("shows edited Hero content from unsaved component edits", () => {
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "content",
    }));

    const { rerender } = render(<EditorPanel />);

    expect(screen.getByLabelText("Título")).toHaveValue("BALFE");

    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "content",
      componentEdits: new Map([
        [
          "hero",
          {
            products: [
              {
                label: "Audio",
                title: "LANZAMIENTO",
                subtitle: "NUEVO",
                description: "Texto preview",
                buttonText: "Comprar",
                image: "/hero.jpg",
              },
            ],
          },
        ],
      ]),
    }));

    rerender(<EditorPanel />);

    expect(screen.getByLabelText("Título")).toHaveValue("LANZAMIENTO");
  });

  it("updates Hero layer controls through flat-compatible products without persisting selection", () => {
    const updateComponentEdit = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "content",
      updateComponentEdit,
    }));

    render(<EditorPanel />);

    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "NUEVO HERO" },
    });

    expect(updateComponentEdit).toHaveBeenCalledWith(
      "hero",
      "products",
      expect.arrayContaining([
        expect.objectContaining({
          title: "NUEVO HERO",
          backgroundImage: "/black-smart-speaker.jpg",
        }),
      ]),
    );
    expect(updateComponentEdit).not.toHaveBeenCalledWith(
      "hero",
      "selectedHeroLayer",
      expect.anything(),
    );
  });

  it("selects, adds and deletes slides through the slide manager", () => {
    const updateComponentEdit = vi.fn();
    const setSelectedHeroSlideIndex = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      updateComponentEdit,
      setSelectedHeroSlideIndex,
      componentEdits: new Map([
        [
          "hero",
          {
            products: [
              { title: "Slide uno", image: "/one.jpg" },
              { title: "Slide dos", image: "/two.jpg" },
            ],
          },
        ],
      ]),
    }));

    render(<EditorPanel />);

    fireEvent.click(screen.getByLabelText("Slide activo"));
    fireEvent.click(screen.getByRole("option", { name: /slide 2 - slide dos/i }));
    expect(setSelectedHeroSlideIndex).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByRole("button", { name: /agregar slide/i }));
    expect(updateComponentEdit).toHaveBeenCalledWith(
      "hero",
      "products",
      expect.arrayContaining([expect.objectContaining({ title: "Slide 3" })]),
    );

    fireEvent.click(screen.getByRole("button", { name: /eliminar slide/i }));
    expect(updateComponentEdit).toHaveBeenCalledWith(
      "hero",
      "products",
      [expect.objectContaining({ title: "Slide dos" })],
    );
  });

  it("activates slide manager and hotspot controls from the keyboard", async () => {
    const user = userEvent.setup();
    const updateComponentEdit = vi.fn();
    const setSelectedHeroSlideIndex = vi.fn();
    const setSelectedHeroHotspotId = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "hotspots",
      updateComponentEdit,
      setSelectedHeroSlideIndex,
      setSelectedHeroHotspotId,
      componentEdits: new Map([
        [
          "hero",
          {
            products: [
              {
                title: "Slide teclado",
                image: "/one.jpg",
                productImage: "/product.png",
                hotspots: [],
              },
            ],
          },
        ],
      ]),
    }));

    render(<EditorPanel />);

    const addSlideButton = screen.getByRole("button", { name: /agregar slide/i });
    addSlideButton.focus();
    await user.keyboard("[Enter]");

    expect(updateComponentEdit).toHaveBeenCalledWith(
      "hero",
      "products",
      expect.arrayContaining([expect.objectContaining({ title: "Slide 2" })]),
    );
    expect(setSelectedHeroSlideIndex).toHaveBeenCalledWith(1);

    const addHotspotButton = screen.getByRole("button", {
      name: /agregar hotspot/i,
    });
    addHotspotButton.focus();
    await user.keyboard(" ");

    expect(updateComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "products",
      expect.arrayContaining([
        expect.objectContaining({
          hotspots: [
            expect.objectContaining({
              id: "hotspot-1",
              label: "Nuevo hotspot",
              anchor: "center-right",
            }),
          ],
        }),
      ]),
    );
    expect(setSelectedHeroHotspotId).toHaveBeenCalledWith("hotspot-1");
  });

  it("updates semantic slide text and product placement on the active slide only", () => {
    const updateComponentEdit = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "content",
      selectedHeroSlideIndex: 1,
      updateComponentEdit,
      componentEdits: new Map([
        [
          "hero",
          {
            products: [
              { title: "Slide uno", image: "/one.jpg", textColor: "#111111" },
              { title: "Slide dos", image: "/two.jpg", textColor: "#222222" },
            ],
          },
        ],
      ]),
    }));

    render(<EditorPanel />);

    fireEvent.change(screen.getByLabelText("Color de texto del slide"), {
      target: { value: "#abcdef" },
    });
    fireEvent.click(screen.getByLabelText("Tamaño de texto"));
    fireEvent.click(screen.getByRole("option", { name: "Compacto" }));

    expect(updateComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "products",
      [
        expect.objectContaining({ title: "Slide uno", textColor: "#111111" }),
        expect.objectContaining({ title: "Slide dos", textSize: "compact" }),
      ],
    );

    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "product",
      selectedHeroSlideIndex: 1,
      updateComponentEdit,
      componentEdits: new Map([
        [
          "hero",
          {
            products: [
              { title: "Slide uno", image: "/one.jpg", productPlacement: "right" },
              { title: "Slide dos", image: "/two.jpg", productPlacement: "right" },
            ],
          },
        ],
      ]),
    }));

    render(<EditorPanel />);

    fireEvent.click(screen.getByLabelText("Ubicación del producto"));
    fireEvent.click(screen.getByRole("option", { name: "Izquierda" }));

    expect(updateComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "products",
      [
        expect.objectContaining({ title: "Slide uno", productPlacement: "right" }),
        expect.objectContaining({ title: "Slide dos", productPlacement: "left" }),
      ],
    );
  });

  it("offers one semantic secondary product slot for centered full-image Hero slides", () => {
    const updateComponentEdit = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "product",
      updateComponentEdit,
      componentEdits: new Map([
        [
          "hero",
          {
            layoutMode: "full-image",
            fullImageContentAlign: "center",
            products: [
              {
                title: "Slide con secundario",
                image: "/hero-bg.jpg",
                productImage: "/primary.png",
                secondaryProductImage: "/secondary.png",
                secondaryProductAlt: "Producto secundario guardado",
                secondaryProductPreset: "primary-right-secondary-left",
              },
            ],
          },
        ],
      ]),
    }));

    render(<EditorPanel />);

    expect(screen.getByText("Producto secundario opcional")).toBeInTheDocument();
    expect(screen.getByLabelText("Imagen secundaria del producto")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Texto alternativo del producto secundario"),
    ).toHaveValue("Producto secundario guardado");

    fireEvent.change(
      screen.getByLabelText("Texto alternativo del producto secundario"),
      { target: { value: "Secundario visible" } },
    );

    expect(updateComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "products",
      [
        expect.objectContaining({
          secondaryProductAlt: "Secundario visible",
          secondaryProductPreset: "primary-right-secondary-left",
        }),
      ],
    );

    fireEvent.click(screen.getByLabelText("Composición secundaria"));
    fireEvent.click(
      screen.getByRole("option", {
        name: "Principal izquierda, secundario derecha",
      }),
    );

    expect(updateComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "products",
      [
        expect.objectContaining({
          secondaryProductPreset: "primary-left-secondary-right",
        }),
      ],
    );
  });

  it("keeps secondary product guardrails semantic without canvas or raw placement controls", () => {
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "product",
      componentEdits: new Map([
        [
          "hero",
          {
            layoutMode: "split",
            fullImageContentAlign: "left",
            products: [
              {
                title: "No soportado",
                image: "/hero-bg.jpg",
                productImage: "/primary.png",
                secondaryProductImage: "/secondary.png",
              },
            ],
          },
        ],
      ]),
    }));

    render(<EditorPanel />);

    expect(
      screen.getByText(/producto secundario está disponible/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText("Texto alternativo del producto secundario"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/canvas/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/arrastr/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coordenadas/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/css/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/px/i)).not.toBeInTheDocument();
  });

  it("blocks hotspot creation without product media and edits hotspots with semantic anchors when media exists", () => {
    const updateComponentEdit = vi.fn();
    const setSelectedHeroHotspotId = vi.fn();
    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "hotspots",
      updateComponentEdit,
      setSelectedHeroHotspotId,
      componentEdits: new Map([["hero", { products: [{ title: "Sin media" }] }]]),
    }));

    const view = render(<EditorPanel />);

    expect(screen.getByText(/necesitás una imagen de producto/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /agregar hotspot/i })).toBeDisabled();

    mockUseAdmin.mockReturnValue(heroAdminState({
      selectedHeroLayer: "hotspots",
      updateComponentEdit,
      setSelectedHeroHotspotId,
      selectedHeroHotspotId: "h-1",
      componentEdits: new Map([
        [
          "hero",
          {
            products: [
              {
                title: "Con media",
                productImage: "/product.png",
                hotspots: [
                  { id: "h-1", label: "Material", description: "Metal", anchor: "top-left" },
                ],
              },
            ],
          },
        ],
      ]),
    }));

    view.rerender(<EditorPanel />);

    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(123);

    fireEvent.click(screen.getByRole("button", { name: /agregar hotspot/i }));
    expect(updateComponentEdit).toHaveBeenCalledWith(
      "hero",
      "products",
      expect.arrayContaining([
        expect.objectContaining({
          hotspots: expect.arrayContaining([
            expect.objectContaining({
              id: "hotspot-1",
              label: "Nuevo hotspot",
              anchor: "center-right",
            }),
          ]),
        }),
      ]),
    );
    dateNowSpy.mockRestore();

    fireEvent.change(screen.getByLabelText("Etiqueta del hotspot"), {
      target: { value: "Confort" },
    });

    expect(updateComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "products",
      expect.arrayContaining([
        expect.objectContaining({
          hotspots: [expect.objectContaining({ id: "h-1", label: "Confort" })],
        }),
      ]),
    );

    fireEvent.click(screen.getByLabelText("Ubicación del hotspot"));
    fireEvent.click(screen.getByRole("option", { name: "Abajo derecha" }));

    expect(updateComponentEdit).toHaveBeenLastCalledWith(
      "hero",
      "products",
      expect.arrayContaining([
        expect.objectContaining({
          hotspots: [
            expect.objectContaining({ id: "h-1", anchor: "bottom-right" }),
          ],
        }),
      ]),
    );
  });

  it("saves enhanced layered Hero payload through updateComponentStyle and reloads it as editable data", async () => {
    const layeredProducts = [
      {
        label: "Audio",
        title: "HERO GUARDADO",
        subtitle: "CAPA NUEVA",
        description: "Persistido desde el editor",
        buttonText: "Ver oferta",
        image: "/legacy-bg.jpg",
        backgroundImage: "/layered-bg.jpg",
        productImage: "/floating-product.png",
        productAlt: "Producto flotante",
        secondaryProductImage: "/secondary-product.png",
        secondaryProductAlt: "Producto secundario persistido",
        secondaryProductPreset: "primary-left-secondary-right",
        textColor: "#22cc88",
        textSize: "balanced",
        productPlacement: "left",
        hotspots: [
          {
            id: "saved-hotspot",
            label: "Driver premium",
            description: "Detalle persistido",
            href: "/products/audio#driver",
            anchor: "bottom-right",
          },
        ],
      },
    ];
    const heroEdits = {
      fullImageContentAlign: "center",
      overlayColor: "#111827",
      overlayOpacity: "0.65",
      products: layeredProducts,
    };
    const refreshStyles = vi.fn();
    const clearComponentEdits = vi.fn();
    const flushScheduledEdits = vi.fn();
    const updateComponentStyleMock = vi.mocked(updateComponentStyle);

    updateComponentStyleMock.mockResolvedValue({ success: true } as never);
    mockUseStyles.mockReturnValue({
      styles: new Map([
        [
          "hero",
          {
            layoutMode: "full-image",
            products: [
              {
                title: "HERO LEGACY",
                image: "/legacy-bg.jpg",
                backgroundImage: "/legacy-bg.jpg",
                buttonText: "Comprar",
              },
            ],
          },
        ],
      ]),
      refreshStyles,
    });
    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      selectedHeroLayer: "content",
      setSelectedHeroLayer: vi.fn(),
      selectedHeroSlideIndex: 0,
      setSelectedHeroSlideIndex: vi.fn(),
      selectedHeroHotspotId: "saved-hotspot",
      setSelectedHeroHotspotId: vi.fn(),
      componentEdits: new Map([["hero", heroEdits]]),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits,
      clearComponentEdits,
      getComponentEditsSnapshot: vi.fn(() => heroEdits),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    const view = render(<EditorPanel />);

    fireEvent.click(screen.getByRole("button", { name: /guardar cambios/i }));

    await waitFor(() => {
      expect(updateComponentStyleMock).toHaveBeenCalledWith(
        "hero",
        expect.objectContaining({
          layoutMode: "full-image",
          fullImageContentAlign: "center",
          overlayColor: "#111827",
          overlayOpacity: "0.65",
          products: layeredProducts,
        }),
      );
    });

    const savedPayload = updateComponentStyleMock.mock.calls[0][1] as Record<
      string,
      any
    >;
    expect(savedPayload).not.toHaveProperty("selectedHeroLayer");
    expect(savedPayload.products[0]).toMatchObject({
      title: "HERO GUARDADO",
      image: "/legacy-bg.jpg",
      backgroundImage: "/layered-bg.jpg",
      productImage: "/floating-product.png",
      productAlt: "Producto flotante",
      secondaryProductImage: "/secondary-product.png",
      secondaryProductAlt: "Producto secundario persistido",
      secondaryProductPreset: "primary-left-secondary-right",
      textColor: "#22cc88",
      textSize: "balanced",
      productPlacement: "left",
      hotspots: [
        {
          id: "saved-hotspot",
          label: "Driver premium",
          description: "Detalle persistido",
          href: "/products/audio#driver",
          anchor: "bottom-right",
        },
      ],
    });
    expect(flushScheduledEdits).toHaveBeenCalledWith("hero");
    await waitFor(() => {
      expect(refreshStyles).toHaveBeenCalled();
      expect(clearComponentEdits).toHaveBeenCalledWith("hero");
    });

    mockUseStyles.mockReturnValue({
      styles: new Map([["hero", savedPayload]]),
      refreshStyles,
    });
    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      selectedHeroLayer: "content",
      setSelectedHeroLayer: vi.fn(),
      selectedHeroSlideIndex: 0,
      setSelectedHeroSlideIndex: vi.fn(),
      selectedHeroHotspotId: "saved-hotspot",
      setSelectedHeroHotspotId: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });

    view.rerender(<EditorPanel />);

    expect(screen.getByLabelText("Título")).toHaveValue("HERO GUARDADO");
    expect(screen.getByLabelText("Mensaje")).toHaveValue(
      "Persistido desde el editor",
    );
    expect(screen.getByLabelText("Color de texto del slide")).toHaveValue(
      "#22cc88",
    );
    expect(screen.getByLabelText("Tamaño de texto")).toHaveTextContent(
      "Balanceado",
    );

    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      selectedHeroLayer: "product",
      setSelectedHeroLayer: vi.fn(),
      selectedHeroSlideIndex: 0,
      setSelectedHeroSlideIndex: vi.fn(),
      selectedHeroHotspotId: "saved-hotspot",
      setSelectedHeroHotspotId: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });
    view.rerender(<EditorPanel />);

    expect(screen.getByLabelText("Ubicación del producto")).toHaveTextContent(
      "Izquierda",
    );
    expect(screen.getByLabelText("Composición secundaria")).toHaveTextContent(
      "Principal izquierda, secundario derecha",
    );
    expect(
      screen.getByLabelText("Texto alternativo del producto secundario"),
    ).toHaveValue("Producto secundario persistido");

    mockUseAdmin.mockReturnValue({
      selectedComponent: "hero",
      selectComponent: vi.fn(),
      selectedHeroLayer: "hotspots",
      setSelectedHeroLayer: vi.fn(),
      selectedHeroSlideIndex: 0,
      setSelectedHeroSlideIndex: vi.fn(),
      selectedHeroHotspotId: "saved-hotspot",
      setSelectedHeroHotspotId: vi.fn(),
      componentEdits: new Map(),
      updateComponentEdit: vi.fn(),
      scheduleComponentEdit: vi.fn(),
      flushScheduledEdits: vi.fn(),
      clearComponentEdits: vi.fn(),
      getComponentEditsSnapshot: vi.fn(() => ({})),
      isEditMode: true,
      toggleEditMode: vi.fn(),
    });
    view.rerender(<EditorPanel />);

    expect(screen.getByLabelText("Etiqueta del hotspot")).toHaveValue(
      "Driver premium",
    );
    expect(screen.getByLabelText("Detalle")).toHaveValue("Detalle persistido");
    expect(screen.getByLabelText("Link opcional")).toHaveValue(
      "/products/audio#driver",
    );
    expect(screen.getByLabelText("Ubicación del hotspot")).toHaveTextContent(
      "Abajo derecha",
    );
  });

  it("routes rapid color edits through the scheduled update path", () => {
    const updateComponentEdit = vi.fn();
    const scheduleComponentEdit = vi.fn();

    mockUseAdmin.mockReturnValue({
      selectedComponent: "popular",
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
      "popular",
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
      selectedComponent: "popular",
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
      selectedComponent: "popular",
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
      "popular",
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
      selectedComponent: "popular",
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
      selectedComponent: "popular",
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
