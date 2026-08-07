"use client"

import { useEffect, useRef } from "react"

// A phase/outcome swap either mounts a fresh component or updates props on
// the same one, so the effect fires again whenever `changeKey` changes
// either way -- focus always lands on the region that just replaced the old
// one, and its own heading text serves as the announcement WCAG 4.1.3 asks
// a live region to give.
export function useFocusOnViewChange<T extends HTMLElement>(changeKey: unknown) {
  const headingRef = useRef<T>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [changeKey])

  return headingRef
}
