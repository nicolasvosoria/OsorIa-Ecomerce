import { describe, expect, it } from "vitest"

import { resolveEmailSender } from "@/lib/email/sender"

describe("resolveEmailSender", () => {
  it("uses the fixed platform sender for auth/console kinds, never a tenant domain", () => {
    expect(resolveEmailSender("signup-confirmation", "Cumbre Dorada", "reply@cumbre.example")).toEqual({
      from: "Osoria <auth@mail.osoria.help>",
    })
    expect(resolveEmailSender("store-mailbox-verification", "Cumbre Dorada", null)).toEqual({
      from: "Osoria <auth@mail.osoria.help>",
    })
  })

  it("uses the store's 'vía Osoria' commerce sender with its verified Reply-To for order kinds", () => {
    expect(resolveEmailSender("order-received", "Cumbre Dorada Café", "hola@cumbredorada.example")).toEqual({
      from: "Cumbre Dorada Café vía Osoria <pedidos@mail.osoria.help>",
      replyTo: "hola@cumbredorada.example",
    })
  })

  it("omits Reply-To for a commerce send when the store has none verified yet", () => {
    expect(resolveEmailSender("merchant-new-order", "Cumbre Dorada Café", null)).toEqual({
      from: "Cumbre Dorada Café vía Osoria <pedidos@mail.osoria.help>",
    })
  })
})
