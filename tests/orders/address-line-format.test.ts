import { describe, expect, it } from "vitest"

import { formatAddressLine } from "@/lib/orders/order-format"

describe("formatAddressLine", () => {
  it("omite las partes vacías en vez de dejar una coma huérfana", () => {
    expect(formatAddressLine(["", "Colombia"])).toBe("Colombia")
    expect(formatAddressLine([null, "Colombia"])).toBe("Colombia")
    expect(formatAddressLine([undefined, "Colombia"])).toBe("Colombia")
    expect(formatAddressLine(["   ", "Colombia"])).toBe("Colombia")
  })

  it("une con coma las partes que sí tienen valor", () => {
    expect(formatAddressLine(["Carrera 10 #20-30", "BOGOTÁ, D.C."])).toBe(
      "Carrera 10 #20-30, BOGOTÁ, D.C.",
    )
  })

  it("devuelve cadena vacía cuando no hay ninguna parte", () => {
    expect(formatAddressLine([null, undefined, ""])).toBe("")
  })
})
