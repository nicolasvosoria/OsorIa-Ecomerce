import * as React from 'react'
import { deferStateUpdate } from '@/lib/react/defer-state-update'

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener('change', onChange)
    deferStateUpdate(() => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT))
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return !!isMobile
}
