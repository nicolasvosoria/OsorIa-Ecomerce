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

export interface HeroProductFeature {
  title: string;
  description: string;
  position: {
    top: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
}

const HERO_PRODUCT_FEATURES: Record<string, HeroProductFeature[]> = {
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

export function HeroFeatureCallouts({
  productTitle,
  onSelectFeature,
}: {
  productTitle: string;
  onSelectFeature: (feature: HeroProductFeature) => void;
}) {
  const features = HERO_PRODUCT_FEATURES[productTitle] ?? [];

  return features.map((feature) => (
    <Tooltip key={feature.title}>
      <TooltipTrigger asChild>
        <button
          className="hidden md:flex absolute items-center justify-center bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 cursor-pointer group z-10"
          style={{
            top: feature.position.top,
            left: feature.position.left,
            right: feature.position.right,
            bottom: feature.position.bottom,
          }}
          onClick={() => onSelectFeature(feature)}
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
          <p className="font-semibold text-sm leading-tight">{feature.title}</p>
          <p className="text-xs opacity-90 leading-relaxed">
            {feature.description}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  ));
}

export function HeroFeatureDialog({
  feature,
  open,
  onOpenChange,
}: {
  feature: HeroProductFeature | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            {feature?.title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {feature?.description}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
