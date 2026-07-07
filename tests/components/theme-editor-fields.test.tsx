import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ColorField } from "@/components/theme/theme-editor-fields"

describe("ColorField", () => {
  it("shows the inherited theme color (not blank) when there is no override yet, inline variant", () => {
    render(
      <ColorField
        id="hero-button"
        label="Color del botón"
        value=""
        inheritedColor="#005aa1"
        inline
      />,
    )

    expect(screen.getByLabelText("Color del botón (selector de color)")).toHaveValue("#005aa1")
    expect(screen.getByLabelText("Color del botón (valor hexadecimal)")).toHaveValue("#005aa1")
  })

  it("shows the explicit override instead of the inherited color once one is set, inline variant", () => {
    render(
      <ColorField
        id="hero-button"
        label="Color del botón"
        value="#ff0000"
        inheritedColor="#005aa1"
        inline
      />,
    )

    expect(screen.getByLabelText("Color del botón (selector de color)")).toHaveValue("#ff0000")
    expect(screen.getByLabelText("Color del botón (valor hexadecimal)")).toHaveValue("#ff0000")
  })

  it("shows the inherited theme color on the swatch trigger when there is no override yet, popover variant", () => {
    render(<ColorField id="hero-button" label="Color del botón" value="" inheritedColor="#005aa1" />)

    const trigger = screen.getByRole("button", { name: "Editar color: Color del botón" })
    expect(trigger).toHaveTextContent("#005aa1")
  })

  it("renders blank when there is no override and no inherited color to fall back to", () => {
    render(<ColorField id="hero-button" label="Color del botón" value="" inline />)

    expect(screen.getByLabelText("Color del botón (valor hexadecimal)")).toHaveValue("")
  })
})
