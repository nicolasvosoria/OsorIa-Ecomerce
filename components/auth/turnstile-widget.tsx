"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

type TurnstileRenderOptions = {
  sitekey: string
  callback: (token: string) => void
  "error-callback": () => void
  "expired-callback": () => void
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string
      remove: (widgetId: string) => void
      reset: (widgetId: string) => void
    }
  }
}

let scriptLoadPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  scriptLoadPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = SCRIPT_SRC
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("No se pudo cargar Turnstile"))
    document.head.appendChild(script)
  })
  return scriptLoadPromise
}

export type TurnstileWidgetHandle = {
  // A solved token is single-use: Cloudflare's siteverify rejects a replay
  // with timeout-or-duplicate. Callers must reset after any failed submit
  // that leaves the form mounted, before the user can retry.
  reset: () => void
}

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void
}

// D26: signup and password recovery show this widget. NEXT_PUBLIC_TURNSTILE_SITE_KEY
// unset (every environment without real Turnstile keys, including this
// repo's whole existing signup/recovery test suite) renders nothing and
// reports no token -- lib/security/turnstile.ts's fail-open decision treats
// that as "unconfigured, skip", not a blocked form.
export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(
  function TurnstileWidget({ onToken }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const onTokenRef = useRef(onToken)
    const widgetIdRef = useRef<string | null>(null)
    useEffect(() => {
      onTokenRef.current = onToken
    })

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

    useImperativeHandle(
      ref,
      () => ({
        reset: () => {
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
          onTokenRef.current(null)
        },
      }),
      [],
    )

    useEffect(() => {
      if (!siteKey || !containerRef.current) return

      let cancelled = false

      loadTurnstileScript().then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current(token),
          "error-callback": () => onTokenRef.current(null),
          "expired-callback": () => onTokenRef.current(null),
        })
      })

      return () => {
        cancelled = true
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        }
      }
    }, [siteKey])

    if (!siteKey) return null

    return <div ref={containerRef} />
  },
)
