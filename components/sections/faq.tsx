"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { useComponentStyle } from "@/contexts/styles-context"
import { useAdmin } from "@/contexts/admin-context"
import { SectionShell } from "@/components/sections/section-shell"
import { isToggleOn } from "@/lib/section-editor/toggle-value"
import { resolveEmptySectionState, useIsPreviewOrAdminSection } from "@/lib/sections/section-empty-state"
import {
  FAQ_COLUMNS_CLASS,
  FAQ_ITEM_STYLE_CLASS,
  resolveFaqColumns,
  resolveFaqItemStyle,
} from "@/lib/sections/faq-variant"

type FaqItem = {
  question: string
  answer: string
}

export const FAQ_DEFAULTS = {
  title: "Preguntas frecuentes",
  description: "",
  // Vacíos para usar los tokens globales del tema por defecto (ver mapeo en Faq).
  sectionBgColor: "",
  cardBgColor: "",
  borderColor: "",
  titleColor: "",
  subtitleColor: "",
  questionColor: "",
  answerColor: "",
  columns: "1",
  itemStyle: "divided",
  singleOpen: false,
  items: [
    {
      question: "¿Cuáles son los tiempos de entrega?",
      answer:
        "Los pedidos se despachan en 24-48 horas hábiles y llegan en un plazo de 3 a 5 días.",
    },
    {
      question: "¿Qué métodos de pago aceptan?",
      answer: "Aceptamos tarjetas de crédito, débito y transferencia bancaria.",
    },
    {
      question: "¿Puedo cambiar o devolver un producto?",
      answer: "Sí, tenés 30 días desde la recepción para solicitar un cambio o devolución.",
    },
    {
      question: "¿Hacen envíos a todo el país?",
      answer: "Sí, realizamos envíos a todas las provincias a través de nuestros couriers asociados.",
    },
  ] satisfies FaqItem[],
}

// Independent-expand accordion: toggling one index never touches the rest of
// the set, so several items can stay open at once. When `singleOpen` is on,
// opening an index instead replaces the set with just that index (or empties
// it when closing the one that was open), so only one item stays expanded.
function toggleOpenIndex(
  openIndexes: Set<number>,
  index: number,
  singleOpen: boolean,
): Set<number> {
  const isOpen = openIndexes.has(index)
  if (singleOpen) {
    return isOpen ? new Set() : new Set([index])
  }
  const next = new Set(openIndexes)
  if (isOpen) {
    next.delete(index)
  } else {
    next.add(index)
  }
  return next
}

export function Faq() {
  const { styles: styleData } = useComponentStyle("faq", FAQ_DEFAULTS)
  const { componentEdits } = useAdmin()
  const isPreviewOrAdmin = useIsPreviewOrAdminSection()
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(new Set())

  // Combinar estilos de BD con ediciones locales para mostrar cambios en tiempo real
  const edits = componentEdits.get("faq") || {}
  // title/description usan ?? porque un string vacío es un valor intencional; los colores usan || porque uno vacío
  // no es válido y cae al token global del tema activo (edit override > tema > default de fábrica).
  const title = edits.title ?? styleData.title ?? FAQ_DEFAULTS.title
  const description = edits.description ?? styleData.description ?? FAQ_DEFAULTS.description
  const sectionBgColor =
    edits.sectionBgColor || styleData.sectionBgColor || "var(--sec-faq-section-bg,var(--muted))"
  const cardBgColor =
    edits.cardBgColor || styleData.cardBgColor || "var(--sec-faq-card-bg,var(--card))"
  const borderColor =
    edits.borderColor || styleData.borderColor || "var(--sec-faq-border,var(--border))"
  const titleColor =
    edits.titleColor || styleData.titleColor || "var(--sec-faq-title,var(--foreground))"
  const subtitleColor =
    edits.subtitleColor ||
    styleData.subtitleColor ||
    "var(--sec-faq-subtitle,var(--muted-foreground))"
  const questionColor =
    edits.questionColor || styleData.questionColor || "var(--sec-faq-question,var(--foreground))"
  const answerColor =
    edits.answerColor ||
    styleData.answerColor ||
    "var(--sec-faq-answer,var(--muted-foreground))"

  // Unlike `whyus`, an explicitly emptied list is NOT refilled with
  // `FAQ_DEFAULTS.items` — a real empty array must survive so
  // `resolveEmptySectionState` below can hide the section on the published site.
  const items: FaqItem[] = edits.items ?? styleData.items ?? FAQ_DEFAULTS.items

  const columns = resolveFaqColumns(edits.columns ?? styleData.columns ?? FAQ_DEFAULTS.columns)
  const itemStyle = resolveFaqItemStyle(
    edits.itemStyle ?? styleData.itemStyle ?? FAQ_DEFAULTS.itemStyle,
  )
  const singleOpen = isToggleOn(
    edits.singleOpen ?? styleData.singleOpen ?? FAQ_DEFAULTS.singleOpen,
  )

  const emptyState = resolveEmptySectionState(items.length, isPreviewOrAdmin)
  if (emptyState === "hidden") return null

  const columnsClass = FAQ_COLUMNS_CLASS[columns]
  const itemStyleClass = FAQ_ITEM_STYLE_CLASS[itemStyle]

  return (
    <SectionShell
      componentName="faq"
      sectionBgColor={sectionBgColor}
      title={title}
      titleColor={titleColor}
      description={description}
      subtitleColor={subtitleColor}
      emptyState={emptyState}
      placeholder="Agregá preguntas frecuentes desde el editor para mostrarlas aquí."
    >
      <div className={`grid ${columnsClass} gap-x-8 gap-y-2 md:gap-y-4`}>
        {items.map((item, index) => {
          const isOpen = openIndexes.has(index)
          const panelId = `faq-answer-${index}`
          return (
            <div
              key={`${item.question}-${index}`}
              className={itemStyleClass}
              style={{
                borderColor,
                backgroundColor: itemStyle === "card" ? cardBgColor : undefined,
              }}
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpenIndexes((current) => toggleOpenIndex(current, index, singleOpen))
                }
                className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium md:text-base"
                style={{ color: questionColor }}
              >
                {item.question}
                <ChevronDown
                  className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {isOpen ? (
                <p id={panelId} className="pb-4 text-sm md:text-base" style={{ color: answerColor }}>
                  {item.answer}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>
    </SectionShell>
  )
}
