import type { HomeSectionEntry } from "@/lib/supabase/types"

// The composable home sections, in their default order. `footer` is fixed
// chrome and `gallery`/`about` are reposteria-only — none of the three are
// part of the composition.
export const COMPOSABLE_SECTION_KEYS = [
  "hero",
  "popular",
  "products",
  "featured",
  "specialOffer",
  "whyus",
  "newsletter",
  "testimonials",
  "logos",
  "faq",
  "video",
  "story",
  "instagram",
] as const

export type ComposableSectionKey = (typeof COMPOSABLE_SECTION_KEYS)[number]

// Composable sections that ship with no content by default (their editable
// list starts empty, so the section itself stays hidden on the published
// site until an admin fills it in — see `resolveEmptySectionState`). They're
// still full members of `COMPOSABLE_SECTION_KEYS` — offered by the "Agregar
// sección" palette, previewable, addable — just excluded from
// `DEFAULT_HOME_COMPOSITION` so new stores don't launch with placeholder
// content on their live home.
const NON_DEFAULT_SECTION_KEYS: readonly ComposableSectionKey[] = [
  "testimonials",
  "logos",
  "faq",
  "video",
  "story",
  "instagram",
]

export const DEFAULT_HOME_COMPOSITION: HomeSectionEntry[] = COMPOSABLE_SECTION_KEYS.filter(
  (key) => !NON_DEFAULT_SECTION_KEYS.includes(key),
).map((key) => ({
  key,
  enabled: true,
}))

function isComposableKey(key: unknown): key is ComposableSectionKey {
  return typeof key === "string" && (COMPOSABLE_SECTION_KEYS as readonly string[]).includes(key)
}

function toValidEntry(raw: unknown): HomeSectionEntry | null {
  if (typeof raw !== "object" || raw === null) return null

  const key = (raw as { key?: unknown }).key
  if (!isComposableKey(key)) return null

  const enabled = (raw as { enabled?: unknown }).enabled
  return { key, enabled: typeof enabled === "boolean" ? enabled : true }
}

function defaultCopy(): HomeSectionEntry[] {
  return DEFAULT_HOME_COMPOSITION.map((entry) => ({ ...entry }))
}

// Validates a stored `home_section_layout.sections` value against the
// composable defaults: drops unknown/duplicate keys and coerces `enabled`,
// preserving stored order. The saved composition is authoritative — missing
// defaults are NOT appended, so a removed section stays removed. New
// composable section types are re-added only via the editor's "Agregar
// sección" palette. A null/undefined/non-array value means "no customization
// yet" (no saved row) and resolves to the full default composition. Any
// array — including an empty one — is a saved composition and is returned
// as-is (sanitized): a saved empty array means the customization
// deliberately removed every section, so it resolves to an empty home.
export function resolveHomeComposition(stored: unknown): HomeSectionEntry[] {
  if (!Array.isArray(stored)) return defaultCopy()

  const seen = new Set<string>()
  const kept: HomeSectionEntry[] = []

  for (const raw of stored) {
    const entry = toValidEntry(raw)
    if (!entry || seen.has(entry.key)) continue
    seen.add(entry.key)
    kept.push(entry)
  }

  return kept
}
