import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { HeroLayerId, HeroLayerModel } from "@/lib/hero/hero-layer-model";
import { HERO_LAYER_OPTIONS } from "./hero-editor-state";

interface HeroEditorPanelProps {
  heroLayerModel: HeroLayerModel | null;
  activeHeroSlideIndex: number;
  activeHeroLayer: HeroLayerId;
  onLayoutModeChange: (value: string) => void;
  onAddSlide: () => void;
  onDeleteSlide: () => void;
  onSelectSlide: (index: number) => void;
  onSelectLayer: (layer: HeroLayerId) => void;
  children: ReactNode;
}

export function HeroEditorPanel({
  heroLayerModel,
  activeHeroSlideIndex,
  activeHeroLayer,
  onLayoutModeChange,
  onAddSlide,
  onDeleteSlide,
  onSelectSlide,
  onSelectLayer,
  children,
}: HeroEditorPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0 custom-scrollbar">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">Editor del Hero</h3>
        <p className="text-sm text-muted-foreground">
          Primero definí el banner, después elegí el slide y por último ajustá
          el componente actual con controles simples.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hero-layout-mode">Tipo de banner</Label>
        <Select
          value={heroLayerModel?.layoutMode ?? "split"}
          onValueChange={onLayoutModeChange}
        >
          <SelectTrigger id="hero-layout-mode" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="split">Split</SelectItem>
            <SelectItem value="full-image">Full Image</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div
        className="space-y-3"
        data-testid="hero-slide-management"
        data-hero-slide-management="flat"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-semibold">Gestión de slides</h4>
            <p className="text-xs text-muted-foreground">
              Sumá, elegí o eliminá slides sin salir del panel lateral.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddSlide}
              aria-label="Agregar slide"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDeleteSlide}
              disabled={(heroLayerModel?.products.length ?? 0) <= 1}
              aria-label="Eliminar slide"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero-slide-select">Slide activo</Label>
          <Select
            value={String(activeHeroSlideIndex)}
            onValueChange={(value) => onSelectSlide(Number(value))}
          >
            <SelectTrigger id="hero-slide-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(heroLayerModel?.products ?? []).map((slide, index) => (
                <SelectItem key={index} value={String(index)}>
                  {`Slide ${index + 1} - ${slide.title || slide.label || "sin título"}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hero-layer-select">Componente del slide</Label>
        <Select value={activeHeroLayer} onValueChange={(value) => onSelectLayer(value as HeroLayerId)}>
          <SelectTrigger id="hero-layer-select" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HERO_LAYER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4 border-t border-border pt-4">{children}</div>
    </div>
  );
}
