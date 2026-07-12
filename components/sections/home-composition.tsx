"use client"

import { Fragment, type ReactNode } from "react"
import { useAdmin } from "@/contexts/admin-context"
import type { HomeSectionEntry } from "@/lib/supabase/types"

export interface HomeCompositionSection {
  key: string
  node: ReactNode
}

interface HomeCompositionProps {
  sections: HomeCompositionSection[]
  composition: HomeSectionEntry[]
  previewMode?: boolean
}

// Renders the store's home sections, in order, skipping disabled entries.
// Each `node` is already wrapped in its own `<EditableWrapper>`, so this
// stays a thin pass-through with no extra wrapper element (sections must
// remain direct children of the `<main>` in `ConditionalHomeContent`).
//
// In preview mode (`?themePreview=1`), the theme customizer's parent window
// can push a live composition override over postMessage (reorder/hide/add/
// remove) — picked up here via `previewComposition`. `ConditionalHomeContent`
// renders every composable section's node in preview, so switching the
// order/visibility here is enough to reflect it instantly, with no reload.
// Outside preview mode `previewComposition` is always null, so this renders
// the server-resolved `composition` exactly as before.
export function HomeComposition({ sections, composition, previewMode }: HomeCompositionProps) {
  const { previewComposition } = useAdmin()
  const effectiveComposition = previewMode && previewComposition ? previewComposition : composition
  const nodeByKey = new Map(sections.map(({ key, node }) => [key, node]))

  return (
    <>
      {effectiveComposition
        .filter((entry) => entry.enabled)
        .map((entry) => {
          const node = nodeByKey.get(entry.key)
          if (!node) return null
          return <Fragment key={entry.key}>{node}</Fragment>
        })}
    </>
  )
}
