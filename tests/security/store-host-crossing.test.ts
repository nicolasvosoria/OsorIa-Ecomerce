import { describe, expect, it } from "vitest"

import { toPlatformAdminHost, toStoreHost } from "@/lib/utils/store-host"

describe("toStoreHost", () => {
  it("cruza del host de la consola al de la tienda conservando el puerto", () => {
    expect(toStoreHost("tienda2", "admin.localhost:3000")).toBe("tienda2.localhost:3000")
  })

  it("cruza en el dominio real", () => {
    expect(toStoreHost("default", "admin.osoria.help")).toBe("default.osoria.help")
  })

  it("es el espejo exacto de toPlatformAdminHost", () => {
    const storeHost = toStoreHost("default", "admin.osoria.help")
    expect(toPlatformAdminHost(storeHost)).toBe("admin.osoria.help")
  })

  it("normaliza el subdominio a minúsculas", () => {
    expect(toStoreHost("  Default  ", "admin.osoria.help")).toBe("default.osoria.help")
  })
})

describe("toStoreHost rejects anything that is not a DNS label", () => {
  it.each(["evil.com/", "a@b", "tienda2:8080", "sub.dominio", "TIENDA_2", "", "-tienda"])(
    "rejects %j",
    (subdomain) => {
      expect(() => toStoreHost(subdomain, "admin.osoria.help")).toThrow()
    },
  )

  it("still accepts a real label", () => {
    expect(toStoreHost("tienda-2", "admin.osoria.help")).toBe("tienda-2.osoria.help")
  })
})
