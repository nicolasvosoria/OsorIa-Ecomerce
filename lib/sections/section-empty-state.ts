"use client"

// Shared empty-state gate for composable sections whose editable list can
// legitimately be empty (testimonials today; logos/FAQ/Instagram-style
// sections later). A section in this state should vanish on the published
// site — nothing to show — but stay visible as an editable placeholder
// inside the theme customizer preview or the storefront's own admin edit
// mode, so it stays reachable to fill in.

import { useAdmin } from "@/contexts/admin-context"
import { useHasHydrated } from "@/lib/hooks/use-has-hydrated"
import { isThemePreviewMode } from "@/lib/theme-font/preview-mode"

export type EmptySectionState = "hidden" | "placeholder" | "content"

// Business rule, no IO: given how many items a section has and whether the
// caller is in preview/admin, decides which of the three states applies.
export function resolveEmptySectionState(
  itemsLength: number,
  isPreviewOrAdmin: boolean,
): EmptySectionState {
  if (itemsLength > 0) return "content"
  return isPreviewOrAdmin ? "placeholder" : "hidden"
}

// True inside the theme customizer's preview iframe, or the live
// storefront's own admin edit mode — the two contexts `resolveEmptySectionState`
// treats as "keep it editable" rather than "hide it".
export function useIsPreviewOrAdminSection(): boolean {
  const hasHydrated = useHasHydrated()
  const { isEditMode } = useAdmin()
  return (hasHydrated && isThemePreviewMode()) || isEditMode
}
