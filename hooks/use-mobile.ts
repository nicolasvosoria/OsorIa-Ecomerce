import * as React from "react"

const MOBILE_BREAKPOINT = 768
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribeToViewportChanges(onViewportChange: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY)
  mediaQuery.addEventListener("change", onViewportChange)
  return () => mediaQuery.removeEventListener("change", onViewportChange)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToViewportChanges,
    () => window.matchMedia(MOBILE_MEDIA_QUERY).matches,
    () => false,
  )
}
