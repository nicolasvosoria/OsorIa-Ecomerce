import { resolveEnumValue } from "@/lib/sections/resolve-enum"

export const NEWSLETTER_CONTENT_ALIGN_OPTIONS = [
  { value: "center", label: "Centrado" },
  { value: "left", label: "Izquierda" },
] as const

export type NewsletterContentAlign = (typeof NEWSLETTER_CONTENT_ALIGN_OPTIONS)[number]["value"]

const NEWSLETTER_CONTENT_ALIGN_VALUES = NEWSLETTER_CONTENT_ALIGN_OPTIONS.map((option) => option.value)

const DEFAULT_NEWSLETTER_CONTENT_ALIGN: NewsletterContentAlign = "center"

export function resolveNewsletterContentAlign(value: unknown): NewsletterContentAlign {
  return resolveEnumValue(value, NEWSLETTER_CONTENT_ALIGN_VALUES, DEFAULT_NEWSLETTER_CONTENT_ALIGN)
}

export const NEWSLETTER_CONTENT_ALIGN_CLASS: Record<NewsletterContentAlign, string> = {
  center: "items-center text-center",
  left: "items-start text-left",
}

export const NEWSLETTER_LAYOUT_OPTIONS = [
  { value: "stacked", label: "Apilado" },
  { value: "split", label: "Dividido" },
] as const

export type NewsletterLayout = (typeof NEWSLETTER_LAYOUT_OPTIONS)[number]["value"]

const NEWSLETTER_LAYOUT_VALUES = NEWSLETTER_LAYOUT_OPTIONS.map((option) => option.value)

const DEFAULT_NEWSLETTER_LAYOUT: NewsletterLayout = "stacked"

export function resolveLayout(value: unknown): NewsletterLayout {
  return resolveEnumValue(value, NEWSLETTER_LAYOUT_VALUES, DEFAULT_NEWSLETTER_LAYOUT)
}
