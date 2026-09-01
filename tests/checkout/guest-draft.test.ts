import { beforeEach, describe, expect, it } from "vitest"

import {
  clearGuestCheckoutDraft,
  readGuestCheckoutDraft,
  saveGuestCheckoutDraft,
} from "@/lib/checkout/guest-draft"

describe("borrador del checkout de invitado", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it("devuelve null cuando no hay nada guardado", () => {
    expect(readGuestCheckoutDraft()).toBeNull()
  })

  it("sobrevive a la recarga con los campos ya escritos", () => {
    saveGuestCheckoutDraft({
      customer_first_name: "Nicolás",
      customer_email: "nicolas@example.org",
      shipping_city: "BOGOTÁ, D.C.",
    })

    expect(readGuestCheckoutDraft()).toMatchObject({
      customer_first_name: "Nicolás",
      customer_email: "nicolas@example.org",
      shipping_city: "BOGOTÁ, D.C.",
    })
  })

  it("se borra cuando el pedido se realiza", () => {
    saveGuestCheckoutDraft({ customer_first_name: "Nicolás" })
    clearGuestCheckoutDraft()

    expect(readGuestCheckoutDraft()).toBeNull()
  })

  it("ignora un borrador corrupto en vez de romper el checkout", () => {
    window.localStorage.setItem("osoria_checkout_guest_draft", "{no es json")

    expect(readGuestCheckoutDraft()).toBeNull()
  })
})
