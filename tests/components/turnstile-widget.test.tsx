import { createRef } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TurnstileWidget, type TurnstileWidgetHandle } from "@/components/auth/turnstile-widget"

describe("TurnstileWidget", () => {
  const originalSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  // Several tests below replace this with a Proxy to observe/drive the
  // appended <script>: restoring it here keeps that override from leaking
  // into later tests, which would otherwise silently intercept their
  // appendChild calls too.
  const originalAppendChild = document.head.appendChild

  afterEach(() => {
    if (originalSiteKey === undefined) {
      delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    } else {
      process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey
    }
    delete window.turnstile
    document.head.appendChild = originalAppendChild
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

  // B1: a rejected script load must not brick every later mount. The first
  // mount's script errors out; a second, later mount (a reopened dialog) must
  // still be able to load Cloudflare's script instead of replaying the same
  // cached rejection forever. A fresh module instance keeps this test's
  // outcome independent of whatever the earlier tests above left in the
  // module-level script-load cache.
  it("shows a visible, generic error when the script fails to load, and retries on the next mount", async () => {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "test-site-key"
    vi.resetModules()
    const { TurnstileWidget: FreshTurnstileWidget } = await import("@/components/auth/turnstile-widget")

    const onToken = vi.fn()
    const appendedScripts: HTMLScriptElement[] = []
    document.head.appendChild = new Proxy(document.head.appendChild.bind(document.head), {
      apply(target, thisArg, args) {
        const script = args[0] as HTMLScriptElement
        appendedScripts.push(script)
        return target.apply(thisArg, args as [Node])
      },
    })

    const { unmount } = render(<FreshTurnstileWidget onToken={onToken} />)
    queueMicrotask(() => appendedScripts[0]?.onerror?.(new Event("error")))

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "No pudimos cargar la verificación de seguridad. Recarga la página.",
      ),
    )
    expect(onToken).not.toHaveBeenCalled()
    unmount()

    // Reopening (a fresh mount) must attempt the script again instead of
    // reusing the rejected promise cached by the first attempt.
    const render_ = vi.fn((_container: HTMLElement, options: { callback: (token: string) => void }) => {
      options.callback("solved-token")
      return "widget-2"
    })
    render(<FreshTurnstileWidget onToken={onToken} />)
    queueMicrotask(() => {
      window.turnstile = { render: render_, remove: vi.fn(), reset: vi.fn() }
      appendedScripts[1]?.onload?.(new Event("load"))
    })

    await waitFor(() => expect(render_).toHaveBeenCalled())
    expect(onToken).toHaveBeenCalledWith("solved-token")
  })
})
