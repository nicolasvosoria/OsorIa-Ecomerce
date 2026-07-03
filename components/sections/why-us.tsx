"use client"

import {
  Headphones,
  Truck,
  CreditCard,
  Tag,
  ShieldCheck,
  RotateCcw,
  Lock,
  MessageCircle,
  Zap,
  BadgeCheck,
  Gift,
  Package,
  PackageCheck,
  Phone,
  Heart,
  Star,
  type LucideIcon,
} from "lucide-react"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"

export type WhyUsIconKey =
  | "support"
  | "shipping"
  | "payment"
  | "discount"
  | "warranty"
  | "returns"
  | "security"
  | "chat"
  | "fast"
  | "quality"
  | "gift"
  | "stock"
  | "delivery"
  | "phone"
  | "favorite"
  | "star"

type WhyUsItem = {
  title: string
  description: string
  icon: WhyUsIconKey
}

export const WHYUS_DEFAULTS = {
  title: "¿Por qué nosotros?",
  sectionBgColor: "#f5f5f5",
  cardBgColor: "#ffffff",
  iconBgColor: "#eef1f4",
  iconColor: "#1e354e",
  titleColor: "#1e354e",
  subtitleColor: "#64748b",
  items: [
    {
      icon: "support",
      title: "Soporte 24/7",
      description: "Y 24/6 (festivos)",
    },
    {
      icon: "shipping",
      title: "Envío Gratis",
      description: "Entrega en 10 Días",
    },
    {
      icon: "payment",
      title: "Pago Fácil",
      description: "Crédito, Débito, QR",
    },
    {
      icon: "discount",
      title: "Grandes Descuentos",
      description: "Gran Stock Disponible",
    },
  ] satisfies WhyUsItem[],
}

const WHYUS_ICON_BY_KEY: Record<WhyUsIconKey, LucideIcon> = {
  support: Headphones,
  shipping: Truck,
  payment: CreditCard,
  discount: Tag,
  warranty: ShieldCheck,
  returns: RotateCcw,
  security: Lock,
  chat: MessageCircle,
  fast: Zap,
  quality: BadgeCheck,
  gift: Gift,
  stock: Package,
  delivery: PackageCheck,
  phone: Phone,
  favorite: Heart,
  star: Star,
}

const DEFAULT_WHYUS_ICON: LucideIcon = WHYUS_ICON_BY_KEY.support

function resolveWhyUsIcon(icon: string): LucideIcon {
  return WHYUS_ICON_BY_KEY[icon as WhyUsIconKey] ?? DEFAULT_WHYUS_ICON
}

export function WhyUs() {
  const { styles: styleData } = useComponentStyle("whyus", WHYUS_DEFAULTS)
  const { componentEdits } = useAdmin()

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("whyus") || {}
  // title usa ?? porque un string vacío es un valor intencional; los colores usan || porque uno vacío no es válido
  const title = edits.title ?? styleData.title ?? WHYUS_DEFAULTS.title
  const sectionBgColor = edits.sectionBgColor || styleData.sectionBgColor || WHYUS_DEFAULTS.sectionBgColor
  const cardBgColor = edits.cardBgColor || styleData.cardBgColor || WHYUS_DEFAULTS.cardBgColor
  const iconBgColor = edits.iconBgColor || styleData.iconBgColor || WHYUS_DEFAULTS.iconBgColor
  const iconColor = edits.iconColor || styleData.iconColor || WHYUS_DEFAULTS.iconColor
  const titleColor = edits.titleColor || styleData.titleColor || WHYUS_DEFAULTS.titleColor
  const subtitleColor = edits.subtitleColor || styleData.subtitleColor || WHYUS_DEFAULTS.subtitleColor
  const mergedItems = edits.items ?? styleData.items ?? WHYUS_DEFAULTS.items
  const items: WhyUsItem[] = mergedItems?.length ? mergedItems : WHYUS_DEFAULTS.items

  return (
    <section
      data-component="whyus"
      className="py-8 md:py-16 px-4"
      style={{
        backgroundColor: sectionBgColor,
      }}
    >
      <div className="container mx-auto">
        <h2
          className="text-2xl md:text-4xl lg:text-[47px] font-heading font-normal text-left mb-6 md:mb-12"
          style={{ color: titleColor }}
        >
          {title}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {items.map((item, index) => {
            const ItemIcon = resolveWhyUsIcon(item.icon)
            return (
              <div
                key={`${item.icon}-${item.title}-${index}`}
                className="flex min-h-[220px] flex-col items-start rounded-2xl border p-6 shadow-sm md:min-h-[260px] md:p-8"
                style={{
                  backgroundColor: cardBgColor,
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl md:h-14 md:w-14"
                  style={{ backgroundColor: iconBgColor }}
                >
                  <ItemIcon
                    className="h-6 w-6 md:h-7 md:w-7"
                    style={{ color: iconColor }}
                  />
                </div>
                <div className="mt-auto">
                  <h3
                    className="font-heading font-normal text-sm md:text-[19px] mb-1"
                    style={{ color: titleColor }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-xs md:text-[15px] font-normal"
                    style={{ color: subtitleColor }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
