"use client";

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  type CSSProperties,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useComponentStyle } from "@/contexts/styles-context";
import { useAdmin } from "@/contexts/admin-context";
import { useTheme } from "@/contexts/theme-context";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  toHeroLayerModel,
  type HeroHotspot,
  type HeroHotspotTarget,
  type HeroLayerId,
  type HeroProductPresence,
  type HeroProductPlacement,
  type HeroSecondaryProductPreset,
  type HeroSlideLayerFields,
} from "@/lib/hero/hero-layer-model";

// Helper para generar slug desde el título
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const textSizeClasses: Record<
  NonNullable<HeroSlideLayerFields["textSize"]>,
  string
> = {
  compact: "text-3xl md:text-5xl lg:text-6xl",
  balanced: "text-4xl md:text-6xl lg:text-7xl",
  feature: "text-4xl md:text-6xl lg:text-[92px]",
};

const secondaryPresetPlacement: Record<
  HeroSecondaryProductPreset,
  { primary: HeroProductPlacement; secondary: HeroProductPlacement }
> = {
  "primary-right-secondary-left": { primary: "right", secondary: "left" },
  "primary-left-secondary-right": { primary: "left", secondary: "right" },
};

const fullImageProductSideClasses: Record<HeroProductPlacement, string> = {
  left: "md:left-8 md:right-auto",
  right: "md:right-8 md:left-auto",
};

const productPresenceFrameClasses: Record<HeroProductPresence, string> = {
  subtle: "opacity-85",
  balanced: "opacity-95",
  prominent: "opacity-100",
};

function getProductCompositionStyle(
  product: HeroSlideLayerFields,
): CSSProperties {
  const productScale = product.productScale ?? 100;
  const productOffsetX = product.productOffsetX ?? 0;
  const productOffsetY = product.productOffsetY ?? 0;

  return {
    "--hero-product-scale": String(productScale / 100),
    "--hero-product-offset-x": `${productOffsetX}%`,
    "--hero-product-offset-y": `${productOffsetY}%`,
    transform:
      "translate(var(--hero-product-offset-x), var(--hero-product-offset-y)) scale(var(--hero-product-scale))",
  } as CSSProperties;
}

function getContentCompositionStyle(
  product: HeroSlideLayerFields,
): CSSProperties {
  const contentOffsetX = product.contentOffsetX ?? 0;
  const contentOffsetY = product.contentOffsetY ?? 0;

  return {
    "--hero-content-offset-x": `${contentOffsetX}%`,
    "--hero-content-offset-y": `${contentOffsetY}%`,
    transform:
      "translate(var(--hero-content-offset-x), var(--hero-content-offset-y))",
  } as CSSProperties;
}

export function HeroBanner() {
  const { activeTheme } = useTheme();
  const { styles: styleData } = useComponentStyle("hero", {
    label: "Electronics",
    title: "BALFE",
    subtitle: "NUEVO MODELO",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
    buttonText: "Comprar ahora",
  });
  const {
    componentEdits,
    selectedHeroLayer,
    selectedHeroSlideIndex = 0,
    selectedHeroHotspotId = null,
  } = useAdmin();
  const [api, setApi] = useState<CarouselApi>();
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<{
    title: string;
    description: string;
  } | null>(null);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [openHotspotId, setOpenHotspotId] = useState<string | null>(null);
  const [hoveredHotspotId, setHoveredHotspotId] = useState<string | null>(null);
  const [focusedHotspotId, setFocusedHotspotId] = useState<string | null>(null);

  // Determinar si el tema es oscuro para ajustar estilos
  const isDarkTheme = useMemo(() => {
    if (!activeTheme) return false;
    // Verificar si el nombre del tema contiene "Oscuro"
    if (activeTheme.theme_name.toLowerCase().includes("oscuro")) {
      return true;
    }
    // También verificar si el background es oscuro (RGB bajo)
    const bgColor = activeTheme.colors.background;
    if (bgColor.startsWith("#")) {
      const r = parseInt(bgColor.slice(1, 3), 16);
      const g = parseInt(bgColor.slice(3, 5), 16);
      const b = parseInt(bgColor.slice(5, 7), 16);
      // Si el promedio de RGB es menor a 128, es un tema oscuro
      const avg = (r + g + b) / 3;
      return avg < 128;
    }
    return false;
  }, [activeTheme]);

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("hero") || {};
  // Usar variables CSS del tema si no hay configuración personalizada
  // Esto permite que los temas oscuros funcionen correctamente
  const bgColor = edits.bgColor ?? styleData.bgColor ?? "var(--primary)";
  const textColor =
    edits.textColor ?? styleData.textColor ?? "var(--primary-foreground)";
  const buttonColor =
    edits.buttonColor ?? styleData.buttonColor ?? "var(--accent)";
  const buttonTextColor =
    edits.buttonTextColor ??
    styleData.buttonTextColor ??
    "var(--accent-foreground)";
  const barColor = edits.barColor ?? styleData.barColor;
  const heroLayerModel = toHeroLayerModel({ ...styleData, ...edits });
  const {
    overlayColor,
    overlayOpacity,
    layoutMode,
    backgroundMode,
    imagePositionX,
    imagePositionY,
    contentAlign: fullImageContentAlign,
  } = heroLayerModel;

  const fullImageObjectPosition = `${imagePositionX} ${imagePositionY}`;
  const fullImageContentPositionClass =
    fullImageContentAlign === "center"
      ? "justify-center"
      : fullImageContentAlign === "right"
        ? "justify-end"
        : "justify-start";
  const fullImageTextAlignClass =
    fullImageContentAlign === "center"
      ? "text-center"
      : fullImageContentAlign === "right"
        ? "text-right"
        : "text-left";

  // Características por producto
  const productFeatures: Record<
    string,
    Array<{
      title: string;
      description: string;
      position: { top: string; left?: string; right?: string; bottom?: string };
    }>
  > = {
    PREMIUM: [
      {
        title: "Cancelación de Ruido Activa",
        description:
          "Tecnología avanzada que elimina el ruido ambiental para una experiencia de audio inmersiva y sin distracciones.",
        position: { top: "20%", right: "10%" },
      },
      {
        title: "Diseño Ergonómico",
        description:
          "Auriculares diseñados para máximo confort durante horas de uso. Almohadillas suaves y ajuste perfecto para cualquier tipo de cabeza.",
        position: { top: "45%", left: "15%" },
      },
      {
        title: "Sonido de Alta Fidelidad",
        description:
          "Drivers de 40mm con respuesta de frecuencia optimizada para reproducir cada detalle del audio con claridad cristalina.",
        position: { top: "auto", bottom: "30%", right: "20%" },
      },
    ],
    BALFE: [
      {
        title: "Conectividad Inteligente",
        description:
          "Conexión Bluetooth 5.0 de alta calidad con asistente de voz integrado para control total con comandos de voz.",
        position: { top: "20%", right: "10%" },
      },
      {
        title: "Sonido Potente",
        description:
          "Altavoz de 20W con graves profundos y agudos claros, perfecto para cualquier tipo de música o contenido.",
        position: { top: "45%", left: "15%" },
      },
      {
        title: "Diseño Moderno",
        description:
          "Estética minimalista que se adapta a cualquier espacio, con acabados premium y materiales de alta calidad.",
        position: { top: "auto", bottom: "30%", right: "20%" },
      },
    ],
    "LAPTOP STAND": [
      {
        title: "Ajuste Ergonómico",
        description:
          "Altura y ángulo ajustables para encontrar la posición perfecta que reduce la tensión en cuello y espalda.",
        position: { top: "20%", right: "10%" },
      },
      {
        title: "Ventilación Mejorada",
        description:
          "Diseño elevado que permite mejor circulación de aire, manteniendo tu laptop fresca durante largas sesiones de trabajo.",
        position: { top: "45%", left: "15%" },
      },
      {
        title: "Material Durable",
        description:
          "Construido en aluminio anodizado de alta calidad, resistente y ligero para uso diario profesional.",
        position: { top: "auto", bottom: "30%", right: "20%" },
      },
    ],
    "MINI PROJECTOR": [
      {
        title: "Resolución HD",
        description:
          "Proyección nítida en alta definición (1080p) con excelente calidad de imagen incluso en espacios iluminados.",
        position: { top: "20%", right: "10%" },
      },
      {
        title: "Portabilidad",
        description:
          "Diseño compacto y ligero que cabe en cualquier mochila, perfecto para presentaciones y entretenimiento móvil.",
        position: { top: "45%", left: "15%" },
      },
      {
        title: "Conectividad Inalámbrica",
        description:
          "Conexión WiFi y Bluetooth para transmitir contenido desde cualquier dispositivo sin cables.",
        position: { top: "auto", bottom: "30%", right: "20%" },
      },
    ],
  };

  // Array de productos editables para el carrusel
  // Usar productos editables si existen, sino usar los por defecto
  const heroProducts = heroLayerModel.products;

  // Función helper para convertir hex a rgba
  const hexToRgba = (hex: string, alpha: number) => {
    // Si el hex no empieza con #, agregarlo
    const hexColor = hex.startsWith("#") ? hex : `#${hex}`;
    // Si el hex es muy corto, usar valores por defecto
    if (hexColor.length < 7) {
      return `rgba(0, 0, 0, ${alpha})`;
    }
    try {
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(0, 0, 0, ${alpha})`;
    }
  };

  // Obtener colores del tema activo
  // Para temas oscuros, esto asegura que se usen los colores correctos
  const accentColor = activeTheme?.colors.accent || "#005aa1";
  const secondaryColor = activeTheme?.colors.secondary || "#c4faff";
  const clampedOverlayOpacity = overlayOpacity;

  const getLayerAttributes = (layerId: HeroLayerId) => ({
    "data-hero-layer": layerId,
    "data-selected-hero-layer":
      selectedHeroLayer === layerId ? "true" : undefined,
  });

  const renderHotspots = (
    hotspots: HeroHotspot[] = [],
    target: HeroHotspotTarget,
  ) => {
    const targetedHotspots = hotspots.filter(
      (hotspot) => (hotspot.target ?? "primary") === target,
    );
    if (targetedHotspots.length === 0) return null;

    return targetedHotspots.map((hotspot) => {
      const isOpen =
        openHotspotId === hotspot.id ||
        hoveredHotspotId === hotspot.id ||
        focusedHotspotId === hotspot.id;
      const detailsId = `hero-hotspot-details-${hotspot.id}`;

      return (
        <div
          key={hotspot.id}
          className="absolute z-50 h-0 w-0 pointer-events-auto"
          data-hero-hotspot-id={hotspot.id}
          data-hero-hotspot-stack="interactive"
          data-selected-hero-hotspot={
            selectedHeroHotspotId === hotspot.id ? "true" : undefined
          }
          style={{
            left: `${hotspot.x ?? 50}%`,
            top: `${hotspot.y ?? 50}%`,
            transform: "translate(-50%, -50%)",
          }}
          onMouseEnter={() => setHoveredHotspotId(hotspot.id)}
          onMouseLeave={(event) => {
            const relatedTarget = event.relatedTarget;
            if (
              relatedTarget instanceof Node &&
              event.currentTarget.contains(relatedTarget)
            ) {
              return;
            }
            setHoveredHotspotId(null);
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            aria-label={hotspot.label}
            aria-expanded={isOpen}
            aria-controls={detailsId}
            data-hero-hotspot-trigger="refined"
            data-hero-hotspot-size="compact-plus"
            className="relative flex h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-foreground shadow-md ring-1 ring-black/10 transition-transform duration-150 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 md:h-4 md:w-4"
            onFocus={() => setFocusedHotspotId(hotspot.id)}
            onBlur={() => setFocusedHotspotId(null)}
            onClick={(event) => {
              event.stopPropagation();
              setOpenHotspotId((current) =>
                current === hotspot.id ? null : hotspot.id,
              );
            }}
          >
            <span
              data-testid={`hero-hotspot-pulse-${hotspot.id}`}
              data-hero-hotspot-pulse="subtle"
              className="absolute inset-[-3px] rounded-full border border-white/45 bg-white/15 opacity-75 motion-safe:animate-pulse"
            />
            <span
              data-testid={`hero-hotspot-plus-horizontal-${hotspot.id}`}
              data-hero-hotspot-plus-bar="horizontal"
              className="absolute h-0.5 w-2 rounded-full bg-primary md:w-2"
            />
            <span
              data-testid={`hero-hotspot-plus-vertical-${hotspot.id}`}
              data-hero-hotspot-plus-bar="vertical"
              className="absolute h-2 w-0.5 rounded-full bg-primary md:h-2"
            />
          </button>
          {isOpen && (
            <div
              id={detailsId}
              role="status"
              data-hero-hotspot-bubble="readable"
              data-hero-hotspot-bubble-position="floating"
              className="absolute bottom-full left-1/2 z-50 mb-3 w-60 -translate-x-1/2 rounded-[22px] border border-white/10 bg-gray-900/50 px-3 py-3 text-left text-white shadow-2xl backdrop-blur"
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-xs font-semibold">{hotspot.label}</p>
              {hotspot.description && (
                <p className="mt-1 text-[10px] leading-relaxed text-white/80">
                  {hotspot.description}
                </p>
              )}
              {hotspot.href && (
                <Link
                  href={hotspot.href}
                  className="mt-2 inline-flex text-xs font-semibold text-white"
                  onClick={(event) => event.stopPropagation()}
                >
                  Ver detalle
                </Link>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const renderProductImageFrame = ({
    src,
    alt,
    width,
    height,
    sizes,
    priority,
    imageClassName,
    hotspots,
    frameTarget,
    presence,
    productCompositionStyle,
  }: {
    src: string;
    alt: string;
    width: number;
    height: number;
    sizes: string;
    priority: boolean;
    imageClassName: string;
    hotspots?: HeroHotspot[];
    frameTarget: HeroHotspotTarget;
    presence: HeroProductPresence;
    productCompositionStyle: CSSProperties;
  }) => (
    <div
      data-hero-product-frame={frameTarget}
      data-product-presence={presence}
      className={`relative inline-flex max-w-full items-center justify-center pointer-events-none transition-transform ${productPresenceFrameClasses[presence]}`}
      style={productCompositionStyle}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={imageClassName}
        sizes={sizes}
        priority={priority}
      />
      {renderHotspots(hotspots, frameTarget)}
    </div>
  );

  // Auto-play: cambiar cada 10 segundos
  useEffect(() => {
    if (!api) return;

    const startAutoplay = () => {
      // Limpiar intervalo anterior si existe
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }

      // Crear nuevo intervalo
      autoplayRef.current = setInterval(() => {
        api.scrollNext();
      }, 10000); // 10 segundos
    };

    // Iniciar auto-play
    startAutoplay();

    // Pausar auto-play cuando el usuario interactúa
    const handleSelect = () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
      // Reiniciar después de 10 segundos de inactividad
      setTimeout(() => {
        startAutoplay();
      }, 10000);
    };

    api.on("select", handleSelect);

    // Limpiar al desmontar
    return () => {
      if (autoplayRef.current) {
        clearInterval(autoplayRef.current);
      }
      api.off("select", handleSelect);
    };
  }, [api]);

  return (
    <section
      data-component="hero"
      data-hero-layout={layoutMode}
      data-hero-viewport-shell={
        layoutMode === "full-image" ? "full-image" : undefined
      }
      data-hero-background-mode={
        layoutMode === "full-image" ? backgroundMode : undefined
      }
      data-hero-side-gutters={layoutMode === "full-image" ? "24px" : undefined}
      onClick={() => setOpenHotspotId(null)}
      className={
        layoutMode === "full-image"
          ? "container relative mx-6 w-auto max-w-none overflow-hidden rounded-2xl md:rounded-3xl mt-2 md:mt-4 mb-4 md:mb-8"
          : "container relative w-full overflow-hidden rounded-2xl md:rounded-3xl mx-auto px-2 md:px-4 mt-2 md:mt-4 mb-4 md:mb-8"
      }
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
    >
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        setApi={setApi}
        className="w-full"
      >
        <CarouselContent>
          {heroProducts.map((product: HeroSlideLayerFields, index: number) => {
            // Usar valores del producto directamente (ya vienen editados)
            const displayLabel = product.label || "";
            const displayTitle = product.title || "";
            const displaySubtitle = product.subtitle || "";
            const displayDescription = product.description || "";
            const displayButtonText = product.buttonText || "";
            const displayImage =
              product.backgroundImage || product.image || "/placeholder.svg";
            const backgroundObjectFit =
              backgroundMode === "fill"
                ? "fill"
                : heroLayerModel.imageFit === "contain"
                  ? "contain"
                  : "cover";
            const productImage = product.productImage;
            const productMediaImage = productImage || displayImage;
            const slideTextColor = product.textColor || textColor;
            const slideTitleSizeClass =
              textSizeClasses[product.textSize ?? "feature"];
            const productPresence = product.productPresence ?? "balanced";
            const productPlacement = product.productPlacement ?? "right";
            const isFullImageLayout = layoutMode === "full-image";
            const canRenderSecondaryProduct =
              isFullImageLayout &&
              fullImageContentAlign === "center" &&
              Boolean(product.secondaryProductImage);
            const secondaryPreset =
              product.secondaryProductPreset ?? "primary-right-secondary-left";
            const resolvedFullImageProductPlacement = canRenderSecondaryProduct
              ? secondaryPresetPlacement[secondaryPreset].primary
              : productPlacement;
            const secondaryProductPlacement =
              secondaryPresetPlacement[secondaryPreset].secondary;
            const productMediaOrderClass =
              productPlacement === "left"
                ? "order-first"
                : "order-first md:order-last";

            return (
              <CarouselItem
                key={index}
                className="basis-full"
                data-selected-hero-slide={
                  selectedHeroSlideIndex === index ? "true" : undefined
                }
              >
                <div
                  className={
                    isFullImageLayout
                      ? "relative h-auto min-h-[clamp(520px,calc(100dvh-96px),860px)]"
                      : "container mx-auto px-4 md:px-8 py-8 pb-20 md:py-16 lg:py-24"
                  }
                >
                  {isFullImageLayout ? (
                    <>
                      <div
                        className="absolute inset-0 z-0 pointer-events-none"
                        data-hero-background-shell={backgroundMode}
                      >
                        {backgroundMode === "stage" ? (
                          <div
                            data-hero-background-stage="contained"
                            className="relative mx-auto h-full"
                          >
                            <Image
                              {...getLayerAttributes("background")}
                              data-testid={
                                index === 0
                                  ? "hero-full-background-image"
                                  : undefined
                              }
                              data-hero-background-fit="stage"
                              src={displayImage}
                              alt={displayTitle || "Hero background image"}
                              fill
                              style={{
                                objectFit: backgroundObjectFit,
                                objectPosition: fullImageObjectPosition,
                              }}
                              sizes="100vw"
                              priority={index === 0}
                            />
                          </div>
                        ) : (
                          <Image
                            {...getLayerAttributes("background")}
                            data-testid={
                              index === 0
                                ? "hero-full-background-image"
                                : undefined
                            }
                            data-hero-background-fit="fill"
                            src={displayImage}
                            alt={displayTitle || "Hero background image"}
                            fill
                            style={{
                              objectFit: backgroundObjectFit,
                              objectPosition: fullImageObjectPosition,
                            }}
                            sizes="100vw"
                            priority={index === 0}
                          />
                        )}
                        <div
                          {...getLayerAttributes("overlay")}
                          className="absolute inset-0 z-10 pointer-events-none"
                          style={{
                            backgroundColor: overlayColor,
                            opacity: clampedOverlayOpacity,
                          }}
                        />
                      </div>
                      <div
                        data-hero-stage="foreground"
                        className="relative z-20 mx-auto h-auto min-h-[clamp(520px,calc(100dvh-96px),860px)] max-w-7xl"
                      >
                        {productImage && (
                          <div
                            {...getLayerAttributes("product")}
                            data-testid={`hero-product-media-${index}`}
                            data-product-placement={
                              resolvedFullImageProductPlacement
                            }
                            data-secondary-preset={
                              canRenderSecondaryProduct
                                ? secondaryPreset
                                : undefined
                            }
                            data-product-presence={productPresence}
                            className="absolute inset-0 z-40 pointer-events-none"
                          >
                            <div
                              className={`absolute inset-x-6 bottom-6 mx-auto flex max-w-xl justify-center opacity-95 md:inset-y-10 md:w-1/2 md:items-center ${fullImageProductSideClasses[resolvedFullImageProductPlacement]}`}
                            >
                              {renderProductImageFrame({
                                src: productImage,
                                alt:
                                  product.productAlt ||
                                  displayTitle ||
                                  "Hero product media",
                                width: 720,
                                height: 720,
                                imageClassName:
                                  "max-h-[220px] w-auto object-contain md:max-h-[420px] lg:max-h-[520px]",
                                sizes: "(max-width: 768px) 80vw, 45vw",
                                priority: index === 0,
                                hotspots: product.hotspots,
                                frameTarget: "primary",
                                presence: productPresence,
                                productCompositionStyle:
                                  getProductCompositionStyle(product),
                              })}
                            </div>
                            {canRenderSecondaryProduct &&
                              product.secondaryProductImage && (
                                <div
                                  data-hero-secondary-product="true"
                                  data-secondary-preset={secondaryPreset}
                                  className={`absolute inset-x-6 bottom-6 mx-auto flex max-w-sm justify-center opacity-90 md:inset-y-16 md:w-1/3 md:items-center ${fullImageProductSideClasses[secondaryProductPlacement]}`}
                                >
                                  {renderProductImageFrame({
                                    src: product.secondaryProductImage,
                                    alt:
                                      product.secondaryProductAlt ||
                                      "Hero secondary product media",
                                    width: 520,
                                    height: 520,
                                    imageClassName:
                                      "max-h-[160px] w-auto object-contain md:max-h-[320px] lg:max-h-[400px]",
                                    sizes: "(max-width: 768px) 60vw, 30vw",
                                    priority: index === 0,
                                    hotspots: product.hotspots,
                                    frameTarget: "secondary",
                                    presence: productPresence,
                                    productCompositionStyle:
                                      getProductCompositionStyle(product),
                                  })}
                                </div>
                              )}
                          </div>
                        )}
                        <div
                          data-testid={
                            index === 0
                              ? "hero-full-content-container"
                              : undefined
                          }
                          data-hero-mobile-sizing="content-safe"
                          className={`relative z-30 flex h-auto min-h-[clamp(520px,calc(100dvh-96px),860px)] items-center px-6 py-12 pointer-events-none md:px-10 lg:px-16 ${fullImageContentPositionClass}`}
                        >
                          <div
                            {...getLayerAttributes("content")}
                            className={`max-w-3xl space-y-4 pointer-events-auto md:space-y-6 ${fullImageTextAlignClass}`}
                            style={{
                              ...getContentCompositionStyle(product),
                              color: slideTextColor,
                            }}
                            data-testid={
                              index === 0
                                ? "hero-full-content-block"
                                : `hero-slide-content-${index}`
                            }
                            data-hero-text-size={product.textSize ?? "feature"}
                          >
                            <span
                              className="inline-block rounded-lg px-4 py-1 text-xs font-inter font-medium md:px-6 md:text-[14.21px]"
                              style={{
                                backgroundColor: "rgba(255, 255, 255, 0.16)",
                              }}
                            >
                              {displayLabel}
                            </span>
                            <div>
                              <h1
                                className={`${slideTitleSizeClass} font-inter font-medium tracking-tight leading-tight`}
                              >
                                {displayTitle}
                              </h1>
                              <h2 className="text-2xl md:text-4xl lg:text-[51px] font-inter font-light tracking-tight">
                                {displaySubtitle}
                              </h2>
                            </div>
                            <p
                              className="max-w-2xl text-sm font-inter font-medium leading-relaxed md:text-[16px]"
                              style={{ opacity: 0.92 }}
                            >
                              {displayDescription}
                            </p>
                            <div
                              {...getLayerAttributes("cta")}
                              className={`relative z-20 mt-6 ${fullImageTextAlignClass}`}
                            >
                              <Button
                                size="lg"
                                className="mb-4 min-h-[44px] w-full touch-manipulation rounded px-6 text-sm font-inter font-medium transition-all duration-200 md:mb-0 md:w-auto md:px-8 md:text-[16px]"
                                style={{
                                  backgroundColor: buttonColor,
                                  color: buttonTextColor,
                                }}
                                asChild
                              >
                                <Link
                                  href={`/products/${generateSlug(displayTitle)}`}
                                >
                                  {displayButtonText} →
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="grid lg:grid-cols-2 gap-6 md:gap-12 items-center">
                      <div
                        className="space-y-4 md:space-y-6 text-center md:text-left"
                        style={{
                          ...getContentCompositionStyle(product),
                          color: slideTextColor,
                        }}
                        data-testid={`hero-slide-content-${index}`}
                        data-hero-text-size={product.textSize ?? "feature"}
                      >
                        <span
                          className="inline-block rounded text-xs md:text-[14.21px] font-inter font-medium rounded-lg px-4 md:px-6 py-1"
                          style={{
                            backgroundColor: activeTheme
                              ? isDarkTheme
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(255, 255, 255, 0.2)"
                              : "rgba(255, 255, 255, 0.2)",
                          }}
                        >
                          {displayLabel}
                        </span>
                        <div>
                          <h1
                            className={`${slideTitleSizeClass} font-inter font-medium tracking-tight leading-tight`}
                          >
                            {displayTitle}
                          </h1>
                          <h2 className="text-2xl md:text-4xl lg:text-[51px] font-inter font-light tracking-tight">
                            {displaySubtitle}
                          </h2>
                        </div>
                        <p
                          className="text-sm md:text-[16px] font-inter font-medium max-w-md mx-auto md:mx-0 leading-relaxed"
                          style={{ opacity: 0.9 }}
                        >
                          {displayDescription}
                        </p>
                        <Button
                          size="lg"
                          className="text-sm md:text-[16px] font-inter font-medium rounded px-6 md:px-8 w-full md:w-auto transition-all duration-200 min-h-[44px] touch-manipulation mb-4 md:mb-0"
                          style={{
                            backgroundColor: buttonColor,
                            color: buttonTextColor,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.filter = "brightness(0.85)";
                            e.currentTarget.style.transform = "scale(1.02)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.filter = "brightness(1)";
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          asChild
                        >
                          <Link
                            href={`/products/${generateSlug(displayTitle)}`}
                          >
                            {displayButtonText} →
                          </Link>
                        </Button>
                      </div>

                      {/* Right - Product Image */}
                      <div
                        {...getLayerAttributes("product")}
                        data-testid={`hero-product-media-${index}`}
                        data-product-placement={productPlacement}
                        className={`relative h-[250px] md:h-[400px] lg:h-[500px] ${productMediaOrderClass}`}
                      >
                        {renderProductImageFrame({
                          src: productMediaImage,
                          alt: displayTitle || "Product image",
                          width: 800,
                          height: 600,
                          imageClassName: "w-full h-full object-contain",
                          sizes:
                            "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw",
                          priority: index === 0,
                          hotspots: product.hotspots,
                          frameTarget: "primary",
                          presence: productPresence,
                          productCompositionStyle:
                            getProductCompositionStyle(product),
                        })}
                        {/* Feature Callouts - Interactivos */}
                        {productFeatures[displayTitle]?.map(
                          (feature, featureIndex) => (
                            <Tooltip key={featureIndex}>
                              <TooltipTrigger asChild>
                                <button
                                  className="hidden md:flex absolute items-center justify-center bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer group z-10"
                                  style={{
                                    top: feature.position.top,
                                    left: feature.position.left,
                                    right: feature.position.right,
                                    bottom: feature.position.bottom,
                                  }}
                                  onClick={() => {
                                    setSelectedFeature(feature);
                                    setIsFeatureDialogOpen(true);
                                  }}
                                  aria-label={`Ver característica: ${feature.title}`}
                                >
                                  <div className="w-3 h-3 bg-gray-800 rounded-full group-hover:bg-gray-900 transition-colors" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="top"
                                sideOffset={8}
                                className="max-w-[280px] bg-gray-900 text-white border-none shadow-xl p-3"
                              >
                                <div className="space-y-1.5">
                                  <p className="font-semibold text-sm leading-tight">
                                    {feature.title}
                                  </p>
                                  <p className="text-xs opacity-90 leading-relaxed">
                                    {feature.description}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {layoutMode !== "full-image" && (
        <div
          data-testid="hero-bottom-bar"
          className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
          style={{
            background: barColor
              ? `linear-gradient(to bottom, ${hexToRgba(barColor, 0.8)}, ${hexToRgba(barColor, 0.4)})`
              : `linear-gradient(to bottom, ${hexToRgba(accentColor, 0.8)}, ${hexToRgba(secondaryColor, 0.6)})`,
            // Asegurar que use los colores del tema activo
            // Si el tema es oscuro, los colores se adaptarán automáticamente
          }}
        />
      )}

      {/* Dialog para mostrar características */}
      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold">
              {selectedFeature?.title}
            </DialogTitle>
            <DialogDescription className="text-base pt-2">
              {selectedFeature?.description}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
}
