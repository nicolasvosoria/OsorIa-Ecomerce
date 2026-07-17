import { describe, expect, it } from "vitest"

import { FOOTER_DEFAULTS } from "@/components/sections/footer-new"

// El link "Mis pedidos" del footer apuntaba a /dashboard, que para un
// role:user cae en el redirect a /admin (app/dashboard/page.tsx) en vez de
// llevar al cliente a su historial de pedidos (D5).
describe("Footer 'Mis pedidos' link", () => {
  it("points at the storefront order history route, not the admin dashboard", () => {
    const ordersLink = FOOTER_DEFAULTS.group2Links.find((link) => link.label === "Mis pedidos")

    expect(ordersLink?.url).toBe("/orders")
    expect(ordersLink?.url).not.toBe("/dashboard")
  })
})
