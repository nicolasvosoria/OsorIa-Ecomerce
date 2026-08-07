import { describe, expect, it } from "vitest"

import type { SavedAddressDraft } from "@/lib/account/schemas"
import {
  createUserAddress,
  deleteUserAddress,
  findDefaultUserAddress,
  listUserAddresses,
  setDefaultUserAddress,
  updateUserAddress,
} from "@/lib/supabase/user-addresses-api"
import { createUserAddressesTable, type AddressRow } from "@/tests/fixtures/user-addresses-table"

const OWNER = "owner-1"
const SOMEONE_ELSE = "owner-2"

function addressRow(overrides: Partial<AddressRow> & Pick<AddressRow, "id">): AddressRow {
  return {
    user_id: OWNER,
    label: null,
    address_line_1: "Cra 1 # 2-3",
    department_code: null,
    department_name: null,
    city: null,
    municipality_code: null,
    location_id: null,
    postal_code: null,
    country: "Colombia",
    is_default: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

const DRAFT: SavedAddressDraft = {
  label: "Casa",
  addressLine1: "Calle 10 # 4-5",
  departmentCode: "05",
  departmentName: "Antioquia",
  city: "Medellín",
  municipalityCode: "05001",
  locationId: "1",
  postalCode: "110111",
  country: "Colombia",
}

function defaultsOf(rows: AddressRow[], userId = OWNER): string[] {
  return rows.filter((row) => row.user_id === userId && row.is_default).map((row) => row.id)
}

describe("listUserAddresses", () => {
  it("hands the owner their own addresses with the default one first", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "old", created_at: "2026-01-01T00:00:00Z" }),
      addressRow({ id: "default", is_default: true, created_at: "2025-01-01T00:00:00Z" }),
      addressRow({ id: "foreign", user_id: SOMEONE_ELSE, is_default: true }),
    ])

    const addresses = await listUserAddresses(OWNER, table.client)

    expect(addresses.map((address) => address.id)).toEqual(["default", "old"])
    expect(addresses[0].isDefault).toBe(true)
  })

  it("hands back an empty book to someone who has saved nothing", async () => {
    const table = createUserAddressesTable([addressRow({ id: "foreign", user_id: SOMEONE_ELSE })])

    expect(await listUserAddresses(OWNER, table.client)).toEqual([])
  })
})

describe("createUserAddress", () => {
  // Primera dirección: nace predeterminada para que nadie tenga que marcar la
  // única que tiene.
  it("makes the first saved address the default one", async () => {
    const table = createUserAddressesTable([])

    await createUserAddress({ userId: OWNER, draft: DRAFT }, table.client)

    const [saved] = table.rows()
    expect(saved.is_default).toBe(true)
    expect(saved.address_line_1).toBe("Calle 10 # 4-5")
    expect(saved.user_id).toBe(OWNER)
  })

  it("leaves the standing default untouched when a second address arrives", async () => {
    const table = createUserAddressesTable([addressRow({ id: "home", is_default: true })])

    await createUserAddress({ userId: OWNER, draft: DRAFT }, table.client)

    expect(defaultsOf(table.rows())).toEqual(["home"])
    expect(table.rows()).toHaveLength(2)
  })

  // La libreta es global por persona (D16): la predeterminada de otro no cuenta.
  it("still gives the first address of a person its default, even if others have one", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "foreign", user_id: SOMEONE_ELSE, is_default: true }),
    ])

    await createUserAddress({ userId: OWNER, draft: DRAFT }, table.client)

    expect(defaultsOf(table.rows())).toHaveLength(1)
    expect(defaultsOf(table.rows(), SOMEONE_ELSE)).toEqual(["foreign"])
  })
})

describe("updateUserAddress", () => {
  it("saves the edited fields without deciding which address is default", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true }),
      addressRow({ id: "office" }),
    ])

    await updateUserAddress(
      { userId: OWNER, addressId: "office", draft: { ...DRAFT, label: "Oficina" } },
      table.client,
    )

    const office = table.rows().find((row) => row.id === "office")
    expect(office?.label).toBe("Oficina")
    expect(office?.city).toBe("Medellín")
    expect(defaultsOf(table.rows())).toEqual(["home"])
  })

  // Una escritura que no toca ninguna fila no puede volver como éxito.
  it("refuses to edit an address that belongs to someone else", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "foreign", user_id: SOMEONE_ELSE, label: "Suya" }),
    ])

    await expect(
      updateUserAddress({ userId: OWNER, addressId: "foreign", draft: DRAFT }, table.client),
    ).rejects.toThrow(/ya no existe/i)
    expect(table.rows()[0].label).toBe("Suya")
  })
})

describe("setDefaultUserAddress", () => {
  it("leaves exactly one default, the chosen one, after a switch", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true }),
      addressRow({ id: "office" }),
    ])

    await setDefaultUserAddress({ userId: OWNER, addressId: "office" }, table.client)

    expect(defaultsOf(table.rows())).toEqual(["office"])
  })

  // El índice parcial es lo que hace imposible la segunda predeterminada, y el
  // doble lo hace cumplir: si el cambio marcara la nueva antes de despejar la
  // vieja, la escritura sería rechazada y este recuento nunca sería 1.
  it("never lets two defaults coexist while switching", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true }),
      addressRow({ id: "office" }),
    ])

    await setDefaultUserAddress({ userId: OWNER, addressId: "office" }, table.client)

    const counts = table.defaultCountsAfterEachWrite(OWNER)
    expect(Math.max(...counts)).toBe(1)
    expect(counts.at(-1)).toBe(1)
  })

  // Volver a marcar la que ya lo era no puede dejar a la persona sin ninguna:
  // la elegida queda fuera del despeje previo.
  it("keeps the standing default without ever opening a gap", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true }),
      addressRow({ id: "office" }),
    ])

    await setDefaultUserAddress({ userId: OWNER, addressId: "home" }, table.client)

    expect(defaultsOf(table.rows())).toEqual(["home"])
    expect(table.defaultCountsAfterEachWrite(OWNER)).not.toContain(0)
  })

  it("does not touch another person's default", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true }),
      addressRow({ id: "office" }),
      addressRow({ id: "foreign", user_id: SOMEONE_ELSE, is_default: true }),
    ])

    await setDefaultUserAddress({ userId: OWNER, addressId: "office" }, table.client)

    expect(defaultsOf(table.rows(), SOMEONE_ELSE)).toEqual(["foreign"])
  })

  it("refuses to promote an address that belongs to someone else", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true }),
      addressRow({ id: "foreign", user_id: SOMEONE_ELSE }),
    ])

    await expect(
      setDefaultUserAddress({ userId: OWNER, addressId: "foreign" }, table.client),
    ).rejects.toThrow(/ya no existe/i)
    expect(defaultsOf(table.rows(), SOMEONE_ELSE)).toEqual([])
  })
})

describe("deleteUserAddress", () => {
  it("promotes the newest remaining address when the default is deleted", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true, created_at: "2026-01-01T00:00:00Z" }),
      addressRow({ id: "older", created_at: "2026-02-01T00:00:00Z" }),
      addressRow({ id: "newest", created_at: "2026-03-01T00:00:00Z" }),
    ])

    await deleteUserAddress({ userId: OWNER, addressId: "home" }, table.client)

    expect(defaultsOf(table.rows())).toEqual(["newest"])
    expect(table.defaultCountsAfterEachWrite(OWNER).at(-1)).toBe(1)
  })

  it("leaves the default alone when another address is deleted", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "home", is_default: true }),
      addressRow({ id: "office" }),
    ])

    await deleteUserAddress({ userId: OWNER, addressId: "office" }, table.client)

    expect(table.rows().map((row) => row.id)).toEqual(["home"])
    expect(defaultsOf(table.rows())).toEqual(["home"])
  })

  it("leaves an empty book with no default when the last address goes", async () => {
    const table = createUserAddressesTable([addressRow({ id: "home", is_default: true })])

    await deleteUserAddress({ userId: OWNER, addressId: "home" }, table.client)

    expect(table.rows()).toEqual([])
    expect(await findDefaultUserAddress(OWNER, table.client)).toBeNull()
  })

  it("refuses to delete an address that belongs to someone else", async () => {
    const table = createUserAddressesTable([
      addressRow({ id: "foreign", user_id: SOMEONE_ELSE, is_default: true }),
    ])

    await expect(
      deleteUserAddress({ userId: OWNER, addressId: "foreign" }, table.client),
    ).rejects.toThrow(/ya no existe/i)
    expect(table.rows()).toHaveLength(1)
  })
})

describe("findDefaultUserAddress", () => {
  it("reads the owner's default and never someone else's", async () => {
    const table = createUserAddressesTable([
      addressRow({
        id: "home",
        label: "Casa",
        is_default: true,
        department_code: "05",
        department_name: "Antioquia",
        city: "Medellín",
        municipality_code: "05001",
        location_id: 1,
      }),
      addressRow({ id: "foreign", user_id: SOMEONE_ELSE, is_default: true }),
    ])

    expect(await findDefaultUserAddress(OWNER, table.client)).toEqual({
      id: "home",
      label: "Casa",
      addressLine1: "Cra 1 # 2-3",
      departmentCode: "05",
      departmentName: "Antioquia",
      city: "Medellín",
      municipalityCode: "05001",
      locationId: "1",
      postalCode: null,
      country: "Colombia",
      isDefault: true,
    })
  })

  it("reports no default for a person who saved nothing", async () => {
    const table = createUserAddressesTable([])

    expect(await findDefaultUserAddress(OWNER, table.client)).toBeNull()
  })
})
