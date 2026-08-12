import { describe, expect, it } from "vitest"

import { buildWhatsAppLink } from "@/lib/stores/whatsapp-contact"

// A9 (delegated): every expected value here is the FULL international number
// the WhatsApp click-to-chat spec requires
// (https://faq.whatsapp.com/... -- https://wa.me/<countrycode><number>, no
// leading 0, +, spaces or punctuation), written out independently of what
// buildWhatsAppLink computes. wa.me/3000000000 has no country code and does
// not reach anyone -- a test built from the function's own output would
// certify that bug instead of catching it.
describe("buildWhatsAppLink (A9: Colombian E.164, or no link at all)", () => {
  it("prepends 57 to a bare 10-digit Colombian mobile", () => {
    expect(buildWhatsAppLink("3000000000")).toBe("https://wa.me/573000000000")
  })

  it("prepends 57 to a bare 10-digit Colombian landline (post-2022 renumbering, 60X prefix)", () => {
    expect(buildWhatsAppLink("6012345678")).toBe("https://wa.me/576012345678")
  })

  it("uses a number already carrying +57 as-is, once the punctuation is stripped", () => {
    expect(buildWhatsAppLink("+57 300 000 0000")).toBe("https://wa.me/573000000000")
  })

  it("uses a number carrying 57 with no plus sign as-is, without doubling the country code", () => {
    expect(buildWhatsAppLink("57 300 000 0000")).toBe("https://wa.me/573000000000")
  })

  it("strips spaces, dashes, dots and parentheses before normalizing", () => {
    expect(buildWhatsAppLink("(300) 000-0000")).toBe("https://wa.me/573000000000")
    expect(buildWhatsAppLink("300.000.0000")).toBe("https://wa.me/573000000000")
    expect(buildWhatsAppLink("300 000 0000")).toBe("https://wa.me/573000000000")
  })

  it("returns null for a number typed with an extension -- the digit count no longer maps to a real number", () => {
    expect(buildWhatsAppLink("300 000 0000 ext 123")).toBeNull()
  })

  it("returns null for a string with no digits at all", () => {
    expect(buildWhatsAppLink("no phone on file")).toBeNull()
  })

  it("returns null for an unrecognizable digit count -- neither 10 digits nor a 57-led 12", () => {
    expect(buildWhatsAppLink("300000000")).toBeNull() // 9 digits
    expect(buildWhatsAppLink("30000000000")).toBeNull() // 11 digits
  })

  it("returns null for a 12-digit number that does not start with 57 -- refuses to guess a country code", () => {
    expect(buildWhatsAppLink("123456789012")).toBeNull()
  })
})
