import { describe, expect, it } from "vitest"

import type { SupabaseAuthClient } from "@/lib/supabase/server-auth-session"
import { getAccountProfile, upsertAccountProfile } from "@/lib/supabase/account-profile-api"

type ProfileRow = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  must_change_password: boolean
}

const OWNER = "owner-1"

function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: OWNER,
    email: "duena@tienda.test",
    first_name: null,
    last_name: null,
    phone: null,
    role: "user",
    must_change_password: false,
    ...overrides,
  }
}

// Doble de ecommerce.user_profiles con la semántica que hace visible el defecto
// de D22: un `update` sobre una fila que no existe toca cero filas y vuelve como
// éxito, exactamente igual que en Postgres. Solo el upsert crea la fila.
function createUserProfilesTable(seed: ProfileRow[]) {
  let rows = seed.map((row) => ({ ...row }))

  function filtered(builderRows: ProfileRow[], id: string | null) {
    return id === null ? builderRows : builderRows.filter((row) => row.id === id)
  }

  function operation(run: (id: string | null) => { data: ProfileRow[]; error: null }) {
    let id: string | null = null
    const builder = {
      eq(_column: string, value: string) {
        id = value
        return builder
      },
      select() {
        return builder
      },
      maybeSingle() {
        const { data } = run(id)
        return Promise.resolve({ data: data[0] ?? null, error: null })
      },
      then(onFulfilled: (result: { data: ProfileRow[]; error: null }) => unknown) {
        return Promise.resolve(run(id)).then(onFulfilled)
      },
    }
    return builder
  }

  const table = {
    select: () => operation((id) => ({ data: filtered(rows, id), error: null })),
    update: (patch: Partial<ProfileRow>) =>
      operation((id) => {
        const touched = filtered(rows, id)
        rows = rows.map((row) => (touched.includes(row) ? { ...row, ...patch } : row))
        return { data: filtered(rows, id), error: null }
      }),
    upsert: (values: ProfileRow) =>
      operation(() => {
        const existing = rows.find((row) => row.id === values.id)
        const saved = { ...profileRow(), ...existing, ...values }
        rows = existing
          ? rows.map((row) => (row.id === values.id ? saved : row))
          : [...rows, saved]
        return { data: [saved], error: null }
      }),
  }

  const client = {
    schema: (schema: string) => ({
      from: (name: string) => {
        if (schema !== "ecommerce" || name !== "user_profiles") {
          throw new Error(`Consulta inesperada contra ${schema}.${name}`)
        }
        return table
      },
    }),
  }

  return { client: client as unknown as SupabaseAuthClient, rows: () => rows.map((row) => ({ ...row })) }
}

describe("getAccountProfile", () => {
  it("reads the name and phone the person already saved", async () => {
    const table = createUserProfilesTable([
      profileRow({ first_name: "Ana", last_name: "Osorio", phone: "3001234567" }),
    ])

    expect(await getAccountProfile(OWNER, table.client)).toEqual({
      firstName: "Ana",
      lastName: "Osorio",
      phone: "3001234567",
    })
  })

  // No tener fila de perfil es un estado normal, no un fallo: el trigger que la
  // crea vive en otra app.
  it("reports no profile instead of failing when the row does not exist yet", async () => {
    const table = createUserProfilesTable([])

    expect(await getAccountProfile(OWNER, table.client)).toBeNull()
  })
})

describe("upsertAccountProfile", () => {
  // El defecto que D22 evita: un UPDATE aquí tocaría cero filas y diría que
  // guardó. Esta aserción solo pasa si la escritura crea la fila.
  it("creates the profile row when the person has none, instead of saving nothing", async () => {
    const table = createUserProfilesTable([])

    await upsertAccountProfile(
      {
        userId: OWNER,
        email: "duena@tienda.test",
        profile: { firstName: "Ana", lastName: "Osorio", phone: "3001234567" },
      },
      table.client,
    )

    expect(table.rows()).toEqual([
      expect.objectContaining({
        id: OWNER,
        email: "duena@tienda.test",
        first_name: "Ana",
        last_name: "Osorio",
        phone: "3001234567",
      }),
    ])
  })

  it("updates the existing row without minting a second one", async () => {
    const table = createUserProfilesTable([profileRow({ first_name: "Ana" })])

    await upsertAccountProfile(
      {
        userId: OWNER,
        email: "duena@tienda.test",
        profile: { firstName: "Ana María", lastName: null, phone: "3001234567" },
      },
      table.client,
    )

    expect(table.rows()).toHaveLength(1)
    expect(table.rows()[0].first_name).toBe("Ana María")
    expect(table.rows()[0].phone).toBe("3001234567")
  })

  // El rol y la contraseña temporal no son del formulario de la cuenta.
  it("leaves the role and the forced-password flag exactly as they were", async () => {
    const table = createUserProfilesTable([
      profileRow({ role: "super_admin", must_change_password: true }),
    ])

    await upsertAccountProfile(
      {
        userId: OWNER,
        email: "duena@tienda.test",
        profile: { firstName: "Ana", lastName: null, phone: null },
      },
      table.client,
    )

    expect(table.rows()[0].role).toBe("super_admin")
    expect(table.rows()[0].must_change_password).toBe(true)
  })

  it("reports a failure when the write leaves no row behind", async () => {
    const noRowsClient = {
      schema: () => ({
        from: () => ({
          upsert: () => ({ select: async () => ({ data: [], error: null }) }),
        }),
      }),
    } as unknown as SupabaseAuthClient

    await expect(
      upsertAccountProfile(
        {
          userId: OWNER,
          email: "duena@tienda.test",
          profile: { firstName: "Ana", lastName: null, phone: null },
        },
        noRowsClient,
      ),
    ).rejects.toThrow(/no dejó ninguna fila/i)
  })

  it("surfaces the database error instead of reporting success", async () => {
    const failingClient = {
      schema: () => ({
        from: () => ({
          upsert: () => ({
            select: async () => ({ data: null, error: { message: "permission denied" } }),
          }),
        }),
      }),
    } as unknown as SupabaseAuthClient

    await expect(
      upsertAccountProfile(
        {
          userId: OWNER,
          email: "duena@tienda.test",
          profile: { firstName: "Ana", lastName: null, phone: null },
        },
        failingClient,
      ),
    ).rejects.toThrow(/permission denied/i)
  })
})
