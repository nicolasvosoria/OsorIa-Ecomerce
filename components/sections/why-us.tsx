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
import {
  WHYUS_COLUMNS_CLASS,
  WHYUS_CONTENT_ALIGN_CARD_CLASS,
  WHYUS_ICON_POSITION_DIRECTION_CLASS,
  WHYUS_ICON_POSITION_ICON_EXTRA_CLASS,
  WHYUS_ICON_POSITION_TEXT_WRAPPER_CLASS,
  WHYUS_ICON_STYLE_CLASS,
  WHYUS_ICON_STYLE_HAS_BG,
  resolveIconPosition,
  resolveIconStyle,
  resolveLayoutFormat,
  resolveWhyusColumns,
  resolveWhyusContentAlign,
} from "@/lib/sections/whyus-variant"

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
  // Vacíos para usar los tokens globales del tema por defecto (ver mapeo en WhyUs).
  sectionBgColor: "",
  cardBgColor: "",
  iconBgColor: "",
  iconColor: "",
  titleColor: "",
  subtitleColor: "",
  columns: "4",
  iconStyle: "roundedSquare",
  contentAlign: "left",
  iconPosition: "top",
  layoutFormat: "cards",
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
  // title usa ?? porque un string vacío es un valor intencional; los colores usan || porque uno vacío
  // no es válido y cae al token global del tema activo (edit override > tema > default de fábrica).
  const title = edits.title ?? styleData.title ?? WHYUS_DEFAULTS.title
  const sectionBgColor =
    edits.sectionBgColor || styleData.sectionBgColor || "var(--sec-whyus-section-bg,var(--muted))"
  const cardBgColor =
    edits.cardBgColor || styleData.cardBgColor || "var(--sec-whyus-card-bg,var(--card))"
  const iconBgColor =
    edits.iconBgColor || styleData.iconBgColor || "var(--sec-whyus-icon-bg,var(--muted))"
  const iconColor =
    edits.iconColor || styleData.iconColor || "var(--sec-whyus-icon,var(--foreground))"
  const titleColor =
    edits.titleColor || styleData.titleColor || "var(--sec-whyus-title,var(--foreground))"
  const subtitleColor =
    edits.subtitleColor ||
    styleData.subtitleColor ||
    "var(--sec-whyus-subtitle,var(--muted-foreground))"
  const mergedItems = edits.items ?? styleData.items ?? WHYUS_DEFAULTS.items
  const items: WhyUsItem[] = mergedItems?.length ? mergedItems : WHYUS_DEFAULTS.items

  const columns = resolveWhyusColumns(edits.columns ?? styleData.columns ?? WHYUS_DEFAULTS.columns)
  const iconStyle = resolveIconStyle(edits.iconStyle ?? styleData.iconStyle ?? WHYUS_DEFAULTS.iconStyle)
  const contentAlign = resolveWhyusContentAlign(
    edits.contentAlign ?? styleData.contentAlign ?? WHYUS_DEFAULTS.contentAlign,
  )
  const iconPosition = resolveIconPosition(
    edits.iconPosition ?? styleData.iconPosition ?? WHYUS_DEFAULTS.iconPosition,
  )
  const layoutFormat = resolveLayoutFormat(
    edits.layoutFormat ?? styleData.layoutFormat ?? WHYUS_DEFAULTS.layoutFormat,
  )

  const columnsClass = WHYUS_COLUMNS_CLASS[columns]
  const iconStyleClass = WHYUS_ICON_STYLE_CLASS[iconStyle]
  const iconHasBg = WHYUS_ICON_STYLE_HAS_BG[iconStyle]
  const contentAlignCardClass = WHYUS_CONTENT_ALIGN_CARD_CLASS[contentAlign]
  const iconPositionDirectionClass = WHYUS_ICON_POSITION_DIRECTION_CLASS[iconPosition]
  const iconPositionTextWrapperClass = WHYUS_ICON_POSITION_TEXT_WRAPPER_CLASS[iconPosition]
  const iconPositionIconExtraClass = WHYUS_ICON_POSITION_ICON_EXTRA_CLASS[iconPosition]

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

        {layoutFormat === "bar" ? (
          <div
            data-testid="whyus-bar"
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 md:justify-between"
          >
            {items.map((item, index) => {
              const ItemIcon = resolveWhyUsIcon(item.icon)
              return (
                <div
                  key={`${item.icon}-${item.title}-${index}`}
                  className="flex items-center gap-2"
                >
                  <ItemIcon className="h-5 w-5 shrink-0" style={{ color: iconColor }} />
                  <span
                    className="text-sm font-medium md:text-base"
                    style={{ color: titleColor }}
                  >
                    {item.title}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className={`grid ${columnsClass} gap-4 md:gap-8`}>
            {items.map((item, index) => {
              const ItemIcon = resolveWhyUsIcon(item.icon)
              return (
                <div
                  key={`${item.icon}-${item.title}-${index}`}
                  className={`flex min-h-[220px] ${iconPositionDirectionClass} ${contentAlignCardClass} rounded-card border border-[var(--border)] p-6 shadow-[var(--shadow-card,none)] md:min-h-[260px] md:p-8`}
                  style={{
                    backgroundColor: cardBgColor,
                  }}
                >
                  <div
                    className={`${iconStyleClass} ${iconPositionIconExtraClass}`}
                    style={iconHasBg ? { backgroundColor: iconBgColor } : undefined}
                  >
                    <ItemIcon
                      className="h-6 w-6 md:h-7 md:w-7"
                      style={{ color: iconColor }}
                    />
                  </div>
                  <div className={iconPositionTextWrapperClass}>
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
        )}
      </div>
    </section>
  )
}
