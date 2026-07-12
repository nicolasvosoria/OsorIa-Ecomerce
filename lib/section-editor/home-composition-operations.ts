// Pure helpers for the sections manager's working composition (drag reorder,
// hide/show, remove). No IO: hosts stage the result through their own
// change callback, mirroring `array-field-operations.ts`.

import { COMPOSABLE_SECTION_KEYS } from "@/lib/sections/home-composition"
import type { HomeSectionEntry } from "@/lib/supabase/types"

export function reorderSectionEntries(
  entries: HomeSectionEntry[],
  activeKey: string,
  overKey: string,
): HomeSectionEntry[] {
  if (activeKey === overKey) return entries

  const fromIndex = entries.findIndex((entry) => entry.key === activeKey)
  const toIndex = entries.findIndex((entry) => entry.key === overKey)
  if (fromIndex === -1 || toIndex === -1) return entries

  const reordered = [...entries]
  const [moved] = reordered.splice(fromIndex, 1)
  reordered.splice(toIndex, 0, moved)
  return reordered
}

export function toggleSectionEnabled(entries: HomeSectionEntry[], key: string): HomeSectionEntry[] {
  return entries.map((entry) => (entry.key === key ? { ...entry, enabled: !entry.enabled } : entry))
}

export function removeSectionEntry(entries: HomeSectionEntry[], key: string): HomeSectionEntry[] {
  return entries.filter((entry) => entry.key !== key)
}

// Re-adds a composable section removed earlier ("Agregar sección"): appends
// it enabled at the end. No-op (same reference) if `key` is already present
// or isn't a composable key, so callers can pass an addable-set key without
// worrying about duplicates or junk.
export function addSectionEntry(entries: HomeSectionEntry[], key: string): HomeSectionEntry[] {
  if (!(COMPOSABLE_SECTION_KEYS as readonly string[]).includes(key)) return entries
  if (entries.some((entry) => entry.key === key)) return entries

  return [...entries, { key, enabled: true }]
}
