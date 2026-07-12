"use client"

import { useSyncExternalStore } from "react"

// Client-only checks (`window.location.search`, `window.EyeDropper`, etc.) are
// unavailable during SSR. Gating them behind this post-hydration flag keeps
// the first client render identical to the server render, so React never
// reports a hydration mismatch.
const subscribeToHydrationStore = () => () => undefined
const clientHydrationSnapshot = () => true
const serverHydrationSnapshot = () => false

export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToHydrationStore,
    clientHydrationSnapshot,
    serverHydrationSnapshot,
  )
}
