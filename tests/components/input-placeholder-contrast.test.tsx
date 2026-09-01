import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Input } from "@/components/ui/input"

describe("Input placeholder", () => {
  it("se atenúa con el token muted y además con opacidad", () => {
    render(<Input placeholder="Juan" aria-label="nombre" />)

    const input = screen.getByLabelText("nombre")
    expect(input.className).toContain("placeholder:text-muted-foreground")
    expect(input.className).toContain("placeholder:opacity-60")
  })

  it("atenúa el placeholder, nunca el input entero", () => {
    render(<Input placeholder="Juan" defaultValue="Nicolás" aria-label="nombre" />)

    const classes = screen.getByLabelText("nombre").className.split(/\s+/)
    expect(classes).toContain("placeholder:opacity-60")
    expect(classes.some((name) => /^opacity-\d+$/.test(name))).toBe(false)
  })
})
