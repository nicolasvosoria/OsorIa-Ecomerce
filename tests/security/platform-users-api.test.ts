import { describe, expect, it, vi } from "vitest"

import { listPlatformUsers } from "@/lib/supabase/platform-users-api"

function serviceReturning(result: { data: unknown; error: unknown }) {
  const eqCalls: unknown[][] = []
  const from = vi.fn((table: string) => {
    if (table !== "user_profiles") {
      throw new Error(`unexpected table ${table}`)
    }
    const builder: any = {
      select: vi.fn(() => builder),
      order: vi.fn(() => builder),
      eq: vi.fn((...args: unknown[]) => {
        eqCalls.push(args)
        return builder
      }),
      limit: vi.fn(() => Promise.resolve(result)),
    }
    return builder
  })

  return { service: { from }, from, eqCalls }
}

describe("listPlatformUsers (super_admin console, D8)", () => {
  it("reads every profile without scoping to a store", async () => {
    const rows = [
      { id: "user-1", email: "a@correo.com", first_name: "A", last_name: null, role: "user" },
      { id: "super-1", email: "s@correo.com", first_name: "S", last_name: null, role: "super_admin" },
    ]
    const { service, from, eqCalls } = serviceReturning({ data: rows, error: null })

    const users = await listPlatformUsers(service)

    expect(from).toHaveBeenCalledWith("user_profiles")
    expect(eqCalls).toEqual([])
    expect(users).toEqual(rows.map((row) => ({ ...row, signupStoreName: null })))
  })

  it("joins each row's signup origin store, best-effort (D8)", async () => {
    const rows = [
      {
        id: "user-1",
        email: "a@correo.com",
        first_name: "A",
        last_name: null,
        role: "user",
        signup_store: { store_name: "Tienda A" },
      },
      {
        id: "super-1",
        email: "s@correo.com",
        first_name: "S",
        last_name: null,
        role: "super_admin",
        signup_store: null,
      },
    ]
    const { service } = serviceReturning({ data: rows, error: null })

    const users = await listPlatformUsers(service)

    expect(users).toEqual([
      {
        id: "user-1",
        email: "a@correo.com",
        first_name: "A",
        last_name: null,
        role: "user",
        signupStoreName: "Tienda A",
      },
      {
        id: "super-1",
        email: "s@correo.com",
        first_name: "S",
        last_name: null,
        role: "super_admin",
        signupStoreName: null,
      },
    ])
  })

  it("surfaces the query error instead of returning a blind empty list", async () => {
    const { service } = serviceReturning({ data: null, error: { message: "permission denied" } })

    await expect(listPlatformUsers(service)).rejects.toThrow(
      "No se pudieron listar los usuarios de la plataforma: permission denied",
    )
  })
})
