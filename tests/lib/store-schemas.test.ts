import { describe, expect, it } from "vitest"

import { createStoreSchema } from "@/lib/stores/schemas"

const validInput = {
  storeName: "Mi Tienda",
  subdomain: "mi-tienda",
  ownerEmail: "duena@correo.com",
  currencyCode: "COP",
  ownerFirstName: "Ana",
  ownerLastName: "Pérez",
}

function subdomainError(subdomain: string): string | undefined {
  const result = createStoreSchema.safeParse({ ...validInput, subdomain })
  return result.success
    ? undefined
    : result.error.issues.find((issue) => issue.path[0] === "subdomain")?.message
}

describe("createStoreSchema subdomain", () => {
  it("accepts a valid DNS label", () => {
    expect(subdomainError("mi-tienda")).toBeUndefined()
  })

  it.each(["default", "www", "admin", "api", "app", "localhost", "staging", "mail"])(
    "rejects the reserved subdomain %s",
    (reserved) => {
      expect(subdomainError(reserved)).toContain("reservado")
    },
  )

  it.each([
    ["uppercase letters", "MiTienda"],
    ["a leading hyphen", "-tienda"],
    ["a trailing hyphen", "tienda-"],
    ["inner spaces", "mi tienda"],
    ["an empty value", ""],
  ])("rejects %s", (_label, subdomain) => {
    expect(subdomainError(subdomain)).toBeDefined()
  })
})

describe("createStoreSchema fields", () => {
  it("requires a non-empty store name", () => {
    const result = createStoreSchema.safeParse({ ...validInput, storeName: "   " })
    expect(result.success).toBe(false)
  })

  it("rejects an invalid owner email", () => {
    const result = createStoreSchema.safeParse({ ...validInput, ownerEmail: "no-es-correo" })
    expect(result.success).toBe(false)
  })

  it("rejects a currency code that is not three uppercase letters", () => {
    expect(createStoreSchema.safeParse({ ...validInput, currencyCode: "cop" }).success).toBe(false)
    expect(createStoreSchema.safeParse({ ...validInput, currencyCode: "PESOS" }).success).toBe(false)
  })

  it("treats owner names as optional", () => {
    const result = createStoreSchema.safeParse({
      storeName: "Mi Tienda",
      subdomain: "mi-tienda",
      ownerEmail: "duena@correo.com",
      currencyCode: "COP",
    })
    expect(result.success).toBe(true)
  })
})
