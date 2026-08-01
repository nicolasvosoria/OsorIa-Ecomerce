import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { StoreServingStateBadge } from "@/components/admin/shell/store-serving-state-badge"

describe("StoreServingStateBadge", () => {
  it("tells the owner an unpublished store is not published and points at the publication panel", () => {
    render(<StoreServingStateBadge state="unpublished" />)

    const link = screen.getByRole("link", { name: /sin publicar/i })
    expect(link).toHaveAttribute("href", "/admin/settings")
  })

  // La suspensión la decide la plataforma y publicar no la levanta: el mensaje
  // tiene que ser otro y no puede ofrecer el interruptor del dueño como remedio.
  it("names the platform as the holder of a suspended store and offers no publication link", () => {
    render(<StoreServingStateBadge state="suspended" />)

    const label = screen.getByText(/suspendida/i)
    expect(label).toHaveTextContent(/plataforma/i)
    expect(screen.queryByText(/sin publicar/i)).not.toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  // El caso en calma no gasta atención: nada que decir cuando la tienda sí se
  // está sirviendo, ni cuando el estado no se pudo resolver.
  it("stays silent for a live store", () => {
    const { container } = render(<StoreServingStateBadge state="live" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("stays silent when the state could not be resolved", () => {
    const { container } = render(<StoreServingStateBadge state={null} />)

    expect(container).toBeEmptyDOMElement()
  })
})
