"use client";

// Presentational renderer for the Hero layer controls (background, product,
// content, overlay, cta, hotspots). Decoupled from admin-context: the host
// (the theme customizer) implements `HeroLayerControlsCallbacks` from its own
// staging state and passes it down.

import { Info, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ImageUpload } from "@/components/admin/image-upload";
import {
  HERO_HOTSPOT_ANCHOR_COORDINATES,
  HERO_HOTSPOT_ANCHOR_OPTIONS,
  HERO_HOTSPOT_TARGET_OPTIONS,
  HERO_BACKGROUND_MODE_OPTIONS,
  HERO_CONTENT_OFFSET,
  HERO_PRODUCT_PLACEMENT_OPTIONS,
  HERO_PRODUCT_OFFSET,
  HERO_PRODUCT_SCALE,
  HERO_SECONDARY_PRODUCT_PRESET_OPTIONS,
  HERO_TEXT_SIZE_OPTIONS,
  clampHeroHotspotCoordinate,
  clampHeroContentOffset,
  clampHeroProductOffset,
  clampHeroProductScale,
  type HeroHotspot,
  type HeroLayerId,
  type HeroLayerModel,
  type HeroSlideLayerFields,
  type HeroSlideUpdateValue,
} from "@/lib/hero/hero-layer-model";
import type { SectionEditorFieldCallbacks } from "./types";

export interface HeroLayerControlsCallbacks extends SectionEditorFieldCallbacks {
  onSlideChange: (
    fieldKey: string,
    value: HeroSlideUpdateValue,
    extraUpdates?: Record<string, HeroSlideUpdateValue>,
  ) => void;
  onAddHotspot: () => void;
  onHotspotChange: (hotspotId: string, updates: Partial<HeroHotspot>) => void;
  onDeleteHotspot: (hotspotId: string) => void;
  onSelectHotspot: (hotspotId: string) => void;
}

export interface HeroLayerControlsProps {
  heroLayerModel: HeroLayerModel | null;
  activeHeroLayer: HeroLayerId;
  activeHeroSlide: HeroSlideLayerFields;
  selectedHeroHotspotId: string | null;
  /** Fallback for the slide text color input (effectiveLocalValues.textColor). */
  fallbackTextColor?: string;
  /** Current top-level hero buttonColor style value. */
  currentButtonColor?: string;
  /** Default hero buttonColor from COMPONENT_FIELDS defaults. */
  fallbackButtonColor?: string;
  callbacks: HeroLayerControlsCallbacks;
}

/**
 * Shared render helper for the recurring `{OPTIONS.map(...)} -> SelectItem`
 * clone found across the background/product/content/hotspots sections.
 * A pure data-driven `.map`, extracted verbatim: same keys, values, labels,
 * order as every inlined occurrence it replaces.
 */
function HeroOptionSelectItems<T extends string>({
  options,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
}) {
  return (
    <>
      {options.map((option) => (
        <SelectItem key={option.value} value={option.value}>
          {option.label}
        </SelectItem>
      ))}
    </>
  );
}

/**
 * Shared render helper for the literal left/center/right SelectItem clone
 * (image horizontal focus vs. content alignment selects share the exact
 * same three options).
 */
function HeroLeftCenterRightSelectItems() {
  return (
    <>
      <SelectItem value="left">Izquierda</SelectItem>
      <SelectItem value="center">Centro</SelectItem>
      <SelectItem value="right">Derecha</SelectItem>
    </>
  );
}

interface HeroBackgroundLayerControlsProps {
  heroLayerModel: HeroLayerModel;
  activeHeroSlide: HeroSlideLayerFields;
  onFieldChange: SectionEditorFieldCallbacks["onFieldChange"];
  onSlideChange: HeroLayerControlsCallbacks["onSlideChange"];
}

function HeroBackgroundLayerControls({
  heroLayerModel,
  activeHeroSlide,
  onFieldChange,
  onSlideChange,
}: HeroBackgroundLayerControlsProps) {
  return (
    <div className="space-y-4">
      <ImageUpload
        value={activeHeroSlide.backgroundImage || activeHeroSlide.image || ""}
        onChange={(url) =>
          onSlideChange("backgroundImage", url, {
            image: activeHeroSlide.image || url,
          })
        }
        label="Imagen de fondo"
        context="hero-background-image"
        recommendedWidth={1920}
        recommendedHeight={1080}
      />
      <div className="space-y-2">
        <Label htmlFor="hero-background-mode">Cobertura del fondo</Label>
        <Select
          value={heroLayerModel.backgroundMode}
          onValueChange={(value) => onFieldChange("backgroundMode", value)}
        >
          <SelectTrigger id="hero-background-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <HeroOptionSelectItems options={HERO_BACKGROUND_MODE_OPTIONS} />
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Estirar ocupa todo el banner. Stage mantiene la proporción del
          fondo dentro del escenario y habilita foco manual.
        </p>
      </div>
      {heroLayerModel.backgroundMode === "stage" && (
        <>
          <div className="space-y-2">
            <Label>Prominencia de imagen</Label>
            <Select
              value={heroLayerModel.imageFit}
              onValueChange={(value) => onFieldChange("imageFit", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Llenar el espacio</SelectItem>
                <SelectItem value="contain">Mostrar completa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Enfoque horizontal</Label>
            <Select
              value={heroLayerModel.imagePositionX}
              onValueChange={(value) =>
                onFieldChange("imagePositionX", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <HeroLeftCenterRightSelectItems />
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Enfoque vertical</Label>
            <Select
              value={heroLayerModel.imagePositionY}
              onValueChange={(value) =>
                onFieldChange("imagePositionY", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Arriba</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="bottom">Abajo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </div>
  );
}

interface HeroProductLayerControlsProps {
  heroLayerModel: HeroLayerModel;
  activeHeroSlide: HeroSlideLayerFields;
  onSlideChange: HeroLayerControlsCallbacks["onSlideChange"];
}

function HeroProductLayerControls({
  heroLayerModel,
  activeHeroSlide,
  onSlideChange,
}: HeroProductLayerControlsProps) {
  const canUseSecondaryProduct =
    heroLayerModel.layoutMode === "full-image" &&
    heroLayerModel.contentAlign === "center";

  return (
    <div className="space-y-4">
      <ImageUpload
        value={activeHeroSlide.productImage || ""}
        onChange={(url) => onSlideChange("productImage", url)}
        label="Imagen PNG del producto"
        context="hero-product-image"
      />
      <div className="space-y-2">
        <Label htmlFor="hero-product-alt">Texto alternativo del producto</Label>
        <Input
          id="hero-product-alt"
          value={activeHeroSlide.productAlt || ""}
          onChange={(event) =>
            onSlideChange("productAlt", event.target.value)
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-product-placement">Ubicación del producto</Label>
        <Select
          value={activeHeroSlide.productPlacement ?? "right"}
          onValueChange={(value) =>
            onSlideChange("productPlacement", value)
          }
        >
          <SelectTrigger id="hero-product-placement" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <HeroOptionSelectItems options={HERO_PRODUCT_PLACEMENT_OPTIONS} />
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 rounded-lg border border-border p-3">
        <div>
          <h4 className="text-sm font-semibold">Composición del producto</h4>
          <p className="text-xs text-muted-foreground">
            Ajustes acotados para mover el producto dentro del stage con
            valores normalizados.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero-product-scale">Escala del producto</Label>
          <Input
            id="hero-product-scale"
            type="number"
            min={HERO_PRODUCT_SCALE.min}
            max={HERO_PRODUCT_SCALE.max}
            step="1"
            value={activeHeroSlide.productScale ?? HERO_PRODUCT_SCALE.default}
            onChange={(event) =>
              onSlideChange(
                "productScale",
                clampHeroProductScale(
                  event.target.value,
                  activeHeroSlide.productScale ?? HERO_PRODUCT_SCALE.default,
                ),
              )
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="hero-product-offset-x">
              Desplazamiento horizontal
            </Label>
            <Input
              id="hero-product-offset-x"
              type="number"
              min={HERO_PRODUCT_OFFSET.min}
              max={HERO_PRODUCT_OFFSET.max}
              step="1"
              value={activeHeroSlide.productOffsetX ?? HERO_PRODUCT_OFFSET.default}
              onChange={(event) =>
                onSlideChange(
                  "productOffsetX",
                  clampHeroProductOffset(
                    event.target.value,
                    activeHeroSlide.productOffsetX ?? HERO_PRODUCT_OFFSET.default,
                  ),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-product-offset-y">
              Desplazamiento vertical
            </Label>
            <Input
              id="hero-product-offset-y"
              type="number"
              min={HERO_PRODUCT_OFFSET.min}
              max={HERO_PRODUCT_OFFSET.max}
              step="1"
              value={activeHeroSlide.productOffsetY ?? HERO_PRODUCT_OFFSET.default}
              onChange={(event) =>
                onSlideChange(
                  "productOffsetY",
                  clampHeroProductOffset(
                    event.target.value,
                    activeHeroSlide.productOffsetY ?? HERO_PRODUCT_OFFSET.default,
                  ),
                )
              }
            />
          </div>
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-border p-3">
        <div>
          <h4 className="text-sm font-semibold">
            Producto secundario opcional
          </h4>
          <p className="text-xs text-muted-foreground">
            Un solo producto adicional, ubicado con composiciones nombradas.
          </p>
        </div>
        {canUseSecondaryProduct ? (
          <>
            <ImageUpload
              value={activeHeroSlide.secondaryProductImage || ""}
              onChange={(url) =>
                onSlideChange("secondaryProductImage", url)
              }
              label="Imagen secundaria del producto"
              context="hero-secondary-product-image"
            />
            <div className="space-y-2">
              <Label htmlFor="hero-secondary-product-alt">
                Texto alternativo del producto secundario
              </Label>
              <Input
                id="hero-secondary-product-alt"
                value={activeHeroSlide.secondaryProductAlt || ""}
                onChange={(event) =>
                  onSlideChange(
                    "secondaryProductAlt",
                    event.target.value,
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hero-secondary-product-preset">
                Composición secundaria
              </Label>
              <Select
                value={
                  activeHeroSlide.secondaryProductPreset ??
                  "primary-right-secondary-left"
                }
                onValueChange={(value) =>
                  onSlideChange("secondaryProductPreset", value)
                }
              >
                <SelectTrigger
                  id="hero-secondary-product-preset"
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <HeroOptionSelectItems
                    options={HERO_SECONDARY_PRODUCT_PRESET_OPTIONS}
                  />
                </SelectContent>
              </Select>
            </div>
          </>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              El producto secundario está disponible solo en Full Image con
              mensaje centrado.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

interface HeroContentLayerControlsProps {
  heroLayerModel: HeroLayerModel;
  activeHeroSlide: HeroSlideLayerFields;
  fallbackTextColor?: string;
  onFieldChange: SectionEditorFieldCallbacks["onFieldChange"];
  onSlideChange: HeroLayerControlsCallbacks["onSlideChange"];
}

function HeroContentLayerControls({
  heroLayerModel,
  activeHeroSlide,
  fallbackTextColor,
  onFieldChange,
  onSlideChange,
}: HeroContentLayerControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-label">Etiqueta</Label>
        <Input
          id="hero-label"
          value={activeHeroSlide.label || ""}
          onChange={(event) =>
            onSlideChange("label", event.target.value)
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-title">Título</Label>
        <Input
          id="hero-title"
          value={activeHeroSlide.title || ""}
          onChange={(event) =>
            onSlideChange("title", event.target.value)
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-subtitle">Subtítulo</Label>
        <Input
          id="hero-subtitle"
          value={activeHeroSlide.subtitle || ""}
          onChange={(event) =>
            onSlideChange("subtitle", event.target.value)
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-description">Mensaje</Label>
        <Textarea
          id="hero-description"
          value={activeHeroSlide.description || ""}
          onChange={(event) =>
            onSlideChange("description", event.target.value)
          }
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>Alineación del mensaje</Label>
        <Select
          value={heroLayerModel.contentAlign}
          onValueChange={(value) =>
            onFieldChange("fullImageContentAlign", value)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <HeroLeftCenterRightSelectItems />
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-slide-text-color">Color de texto del slide</Label>
        <Input
          id="hero-slide-text-color"
          type="color"
          value={activeHeroSlide.textColor || fallbackTextColor || "#ffffff"}
          onChange={(event) =>
            onSlideChange("textColor", event.target.value)
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-slide-text-size">Tamaño de texto</Label>
        <Select
          value={activeHeroSlide.textSize ?? "feature"}
          onValueChange={(value) => onSlideChange("textSize", value)}
        >
          <SelectTrigger id="hero-slide-text-size" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <HeroOptionSelectItems options={HERO_TEXT_SIZE_OPTIONS} />
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-3 rounded-lg border border-border p-3">
        <div>
          <h4 className="text-sm font-semibold">Composición del contenido</h4>
          <p className="text-xs text-muted-foreground">
            Ajustes acotados para mover el contenido dentro del stage con
            valores normalizados.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="hero-content-offset-x">
              Mover contenido horizontal
            </Label>
            <Input
              id="hero-content-offset-x"
              type="number"
              min={HERO_CONTENT_OFFSET.min}
              max={HERO_CONTENT_OFFSET.max}
              step="1"
              value={activeHeroSlide.contentOffsetX ?? HERO_CONTENT_OFFSET.default}
              onChange={(event) =>
                onSlideChange(
                  "contentOffsetX",
                  clampHeroContentOffset(
                    event.target.value,
                    activeHeroSlide.contentOffsetX ?? HERO_CONTENT_OFFSET.default,
                  ),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-content-offset-y">
              Mover contenido vertical
            </Label>
            <Input
              id="hero-content-offset-y"
              type="number"
              min={HERO_CONTENT_OFFSET.min}
              max={HERO_CONTENT_OFFSET.max}
              step="1"
              value={activeHeroSlide.contentOffsetY ?? HERO_CONTENT_OFFSET.default}
              onChange={(event) =>
                onSlideChange(
                  "contentOffsetY",
                  clampHeroContentOffset(
                    event.target.value,
                    activeHeroSlide.contentOffsetY ?? HERO_CONTENT_OFFSET.default,
                  ),
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface HeroOverlayLayerControlsProps {
  heroLayerModel: HeroLayerModel;
  onFieldChange: SectionEditorFieldCallbacks["onFieldChange"];
}

function HeroOverlayLayerControls({
  heroLayerModel,
  onFieldChange,
}: HeroOverlayLayerControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-overlay-color">Contraste</Label>
        <Input
          id="hero-overlay-color"
          type="color"
          value={heroLayerModel.overlayColor}
          onChange={(event) =>
            onFieldChange("overlayColor", event.target.value)
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-overlay-opacity">Intensidad</Label>
        <Input
          id="hero-overlay-opacity"
          type="number"
          min="0"
          max="0.9"
          step="0.05"
          value={heroLayerModel.overlayOpacity}
          onChange={(event) =>
            onFieldChange("overlayOpacity", event.target.value)
          }
        />
      </div>
    </div>
  );
}

interface HeroHotspotsLayerControlsProps {
  heroLayerModel: HeroLayerModel;
  activeHeroSlide: HeroSlideLayerFields;
  selectedHeroHotspotId: string | null;
  onAddHotspot: HeroLayerControlsCallbacks["onAddHotspot"];
  onHotspotChange: HeroLayerControlsCallbacks["onHotspotChange"];
  onDeleteHotspot: HeroLayerControlsCallbacks["onDeleteHotspot"];
  onSelectHotspot: HeroLayerControlsCallbacks["onSelectHotspot"];
}

function HeroHotspotsLayerControls({
  heroLayerModel,
  activeHeroSlide,
  selectedHeroHotspotId,
  onAddHotspot,
  onHotspotChange,
  onDeleteHotspot,
  onSelectHotspot,
}: HeroHotspotsLayerControlsProps) {
  const canEditHotspots = Boolean(activeHeroSlide.productImage);
  const hotspots = activeHeroSlide.hotspots ?? [];
  const editableHotspot =
    hotspots.find((hotspot) => hotspot.id === selectedHeroHotspotId) ??
    hotspots[0];
  const canUseSecondaryHotspot =
    heroLayerModel.layoutMode === "full-image" &&
    heroLayerModel.contentAlign === "center" &&
    Boolean(activeHeroSlide.secondaryProductImage);
  const hasUnavailableSecondaryTarget =
    editableHotspot?.target === "secondary" && !canUseSecondaryHotspot;

  return (
    <div className="space-y-4">
      {!canEditHotspots && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Para ubicar hotspots necesitás una imagen de producto en este
            slide.
          </AlertDescription>
        </Alert>
      )}

      <Button
        type="button"
        variant="outline"
        onClick={onAddHotspot}
        disabled={!canEditHotspots}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Agregar hotspot
      </Button>

      {canEditHotspots && hotspots.length > 0 && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="hero-hotspot-active">Hotspot activo</Label>
            <Select
              value={editableHotspot?.id}
              onValueChange={(value) => onSelectHotspot(value)}
            >
              <SelectTrigger id="hero-hotspot-active" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {hotspots.map((hotspot, index) => (
                  <SelectItem key={hotspot.id} value={hotspot.id}>
                    {hotspot.label || `Hotspot ${index + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editableHotspot && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="space-y-2">
                <Label htmlFor="hero-hotspot-label">Etiqueta del hotspot</Label>
                <Input
                  id="hero-hotspot-label"
                  value={editableHotspot.label}
                  onChange={(event) =>
                    onHotspotChange(editableHotspot.id, {
                      label: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-hotspot-description">Detalle</Label>
                <Textarea
                  id="hero-hotspot-description"
                  value={editableHotspot.description || ""}
                  onChange={(event) =>
                    onHotspotChange(editableHotspot.id, {
                      description: event.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-hotspot-link">Link opcional</Label>
                <Input
                  id="hero-hotspot-link"
                  value={editableHotspot.href || ""}
                  onChange={(event) =>
                    onHotspotChange(editableHotspot.id, {
                      href: event.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-hotspot-anchor">Preset del hotspot</Label>
                <Label htmlFor="hero-hotspot-anchor" className="sr-only">
                  Ubicación del hotspot
                </Label>
                <Select
                  value={editableHotspot.anchor}
                  onValueChange={(value) =>
                    onHotspotChange(editableHotspot.id, {
                      anchor: value as HeroHotspot["anchor"],
                      ...HERO_HOTSPOT_ANCHOR_COORDINATES[
                        value as HeroHotspot["anchor"]
                      ],
                    })
                  }
                >
                  <SelectTrigger id="hero-hotspot-anchor" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <HeroOptionSelectItems options={HERO_HOTSPOT_ANCHOR_OPTIONS} />
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-hotspot-target">Producto objetivo</Label>
                <Select
                  value={editableHotspot.target ?? "primary"}
                  onValueChange={(value) =>
                    onHotspotChange(editableHotspot.id, {
                      target: value as HeroHotspot["target"],
                    })
                  }
                >
                  <SelectTrigger id="hero-hotspot-target" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">
                      {HERO_HOTSPOT_TARGET_OPTIONS[0].label}
                    </SelectItem>
                    {canUseSecondaryHotspot ? (
                      <SelectItem value="secondary">
                        {HERO_HOTSPOT_TARGET_OPTIONS[1].label}
                      </SelectItem>
                    ) : (
                      <SelectItem value="secondary" disabled>
                        Secundario no disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {hasUnavailableSecondaryTarget && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Este hotspot apunta al producto secundario, pero este
                    slide no tiene un producto secundario disponible.
                  </AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="hero-hotspot-x">Posición horizontal</Label>
                  <Input
                    id="hero-hotspot-x"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editableHotspot.x ?? 50}
                    onChange={(event) =>
                      onHotspotChange(editableHotspot.id, {
                        x: clampHeroHotspotCoordinate(
                          event.target.value,
                          editableHotspot.x ?? 50,
                        ),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-hotspot-y">Posición vertical</Label>
                  <Input
                    id="hero-hotspot-y"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editableHotspot.y ?? 50}
                    onChange={(event) =>
                      onHotspotChange(editableHotspot.id, {
                        y: clampHeroHotspotCoordinate(
                          event.target.value,
                          editableHotspot.y ?? 50,
                        ),
                      })
                    }
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => onDeleteHotspot(editableHotspot.id)}
                className="w-full text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar hotspot
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface HeroCtaLayerControlsProps {
  activeHeroSlide: HeroSlideLayerFields;
  currentButtonColor?: string;
  fallbackButtonColor?: string;
  onFieldChange: SectionEditorFieldCallbacks["onFieldChange"];
  onSlideChange: HeroLayerControlsCallbacks["onSlideChange"];
}

function HeroCtaLayerControls({
  activeHeroSlide,
  currentButtonColor,
  fallbackButtonColor,
  onFieldChange,
  onSlideChange,
}: HeroCtaLayerControlsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-cta-text">Texto de la acción</Label>
        <Input
          id="hero-cta-text"
          value={activeHeroSlide.buttonText || ""}
          onChange={(event) =>
            onSlideChange("buttonText", event.target.value)
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-button-color">Color de acción</Label>
        <Input
          id="hero-button-color"
          type="color"
          value={currentButtonColor || fallbackButtonColor || "#005aa1"}
          onChange={(event) =>
            onFieldChange("buttonColor", event.target.value)
          }
        />
      </div>
    </div>
  );
}

export function HeroLayerControls({
  heroLayerModel,
  activeHeroLayer,
  activeHeroSlide,
  selectedHeroHotspotId,
  fallbackTextColor,
  currentButtonColor,
  fallbackButtonColor,
  callbacks,
}: HeroLayerControlsProps) {
  if (!heroLayerModel) return null;

  const {
    onFieldChange,
    onSlideChange,
    onAddHotspot,
    onHotspotChange,
    onDeleteHotspot,
    onSelectHotspot,
  } = callbacks;

  if (activeHeroLayer === "background") {
    return (
      <HeroBackgroundLayerControls
        heroLayerModel={heroLayerModel}
        activeHeroSlide={activeHeroSlide}
        onFieldChange={onFieldChange}
        onSlideChange={onSlideChange}
      />
    );
  }

  if (activeHeroLayer === "product") {
    return (
      <HeroProductLayerControls
        heroLayerModel={heroLayerModel}
        activeHeroSlide={activeHeroSlide}
        onSlideChange={onSlideChange}
      />
    );
  }

  if (activeHeroLayer === "content") {
    return (
      <HeroContentLayerControls
        heroLayerModel={heroLayerModel}
        activeHeroSlide={activeHeroSlide}
        fallbackTextColor={fallbackTextColor}
        onFieldChange={onFieldChange}
        onSlideChange={onSlideChange}
      />
    );
  }

  if (activeHeroLayer === "overlay") {
    return (
      <HeroOverlayLayerControls
        heroLayerModel={heroLayerModel}
        onFieldChange={onFieldChange}
      />
    );
  }

  if (activeHeroLayer === "hotspots") {
    return (
      <HeroHotspotsLayerControls
        heroLayerModel={heroLayerModel}
        activeHeroSlide={activeHeroSlide}
        selectedHeroHotspotId={selectedHeroHotspotId}
        onAddHotspot={onAddHotspot}
        onHotspotChange={onHotspotChange}
        onDeleteHotspot={onDeleteHotspot}
        onSelectHotspot={onSelectHotspot}
      />
    );
  }

  return (
    <HeroCtaLayerControls
      activeHeroSlide={activeHeroSlide}
      currentButtonColor={currentButtonColor}
      fallbackButtonColor={fallbackButtonColor}
      onFieldChange={onFieldChange}
      onSlideChange={onSlideChange}
    />
  );
}
