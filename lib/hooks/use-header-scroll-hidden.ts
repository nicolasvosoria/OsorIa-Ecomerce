"use client"

import { useEffect, useState } from "react"
import { deferStateUpdate } from "@/lib/react/defer-state-update"

const SCROLL_HIDE_THRESHOLD_PX = 80

export function useHeaderScrollHidden(enabled: boolean): boolean {
  const [isHidden, setIsHidden] = useState(false)

  useEffect(() => {
    if (!enabled) {
      deferStateUpdate(() => setIsHidden(false))
      return
    }

    let lastScrollY = window.scrollY
    let scheduled = false

    const updateVisibility = () => {
      const currentScrollY = window.scrollY
      const scrolledPastThreshold = currentScrollY > SCROLL_HIDE_THRESHOLD_PX
      const scrolledDown = currentScrollY > lastScrollY

      setIsHidden(scrolledPastThreshold && scrolledDown)
      lastScrollY = currentScrollY
      scheduled = false
    }

    const handleScroll = () => {
      if (scheduled) return
      scheduled = true
      requestAnimationFrame(updateVisibility)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [enabled])

  return isHidden
}
