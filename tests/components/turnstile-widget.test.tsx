import { createRef } from "react"
import { render, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/auth/turnstile-widget"

describe("TurnstileWidget", () => {
  const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  afterEach(() => {
    if (originalSiteKey === undefined) {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    } else {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey
    }
    delete window.turnstile
    document.querySelectorAll("script").forEach((script) => script.remove())
  })

  // D26's "absent" state: the widget must not block the surrounding form.
  it("renders nothing and never calls onToken when unconfigured", () => {
    delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    const onToken = vi.fn()

    const { container } = render(<TurnstileWidget onToken={onToken} />)

    expect(container).toBeEmptyDOMElement()
    expect(onToken).not.toHaveBeenCalled()
  })

  // D26's "present" state: renders a container and asks Cloudflare's script
  // to mount a widget into it, wiring the token callback through.
  it("renders a container and forwards Cloudflare's callback token once configured", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key"
    const onToken = vi.fn()
    const render_ = vi.fn((_container: HTMLElement, options: { callback: (token: string) => void }) => {
      options.callback("solved-token")
      return "widget-1"
    })
    const remove = vi.fn()

    document.head.appendChild = new Proxy(document.head.appendChild.bind(document.head), {
      apply(target, thisArg, args) {
        const script = args[0] as HTMLScriptElement
        window.turnstile = { render: render_, remove, reset: vi.fn() }
        queueMicrotask(() => script.onload?.(new Event("load")))
        return target.apply(thisArg, args as [Node])
      },
    })

    const { unmount, container } = render(<TurnstileWidget onToken={onToken} />)

    await waitFor(() => expect(render_).toHaveBeenCalled())
    expect(render_).toHaveBeenCalledWith(
      container.firstChild,
      expect.objectContaining({ sitekey: "test-site-key" }),
    )
    expect(onToken).toHaveBeenCalledWith("solved-token")

    unmount()
    expect(remove).toHaveBeenCalledWith("widget-1")
  })

  // A solved token is single-use (Cloudflare answers timeout-or-duplicate on
  // replay), so callers reset the widget after any failed submit that leaves
  // the form mounted -- this is the imperative handle they call.
  it("clears the token and asks Cloudflare to reset the widget when reset() is called", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key"
    const onToken = vi.fn()
    const reset = vi.fn()
    const render_ = vi.fn((_container: HTMLElement, options: { callback: (token: string) => void }) => {
      options.callback("solved-token")
      return "widget-1"
    })
    // window.turnstile already present (as it would be once Cloudflare's
    // script has loaded once) short-circuits loadTurnstileScript's module-
    // level promise cache, so this doesn't depend on script-loading order
    // relative to the previous test.
    window.turnstile = { render: render_, remove: vi.fn(), reset }

    const ref = createRef<TurnstileWidgetHandle>()
    render(<TurnstileWidget ref={ref} onToken={onToken} />)

    await waitFor(() => expect(onToken).toHaveBeenCalledWith("solved-token"))

    ref.current?.reset()

    expect(reset).toHaveBeenCalledWith("widget-1")
    expect(onToken).toHaveBeenLastCalledWith(null)
  })
})
