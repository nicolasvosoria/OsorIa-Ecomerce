import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { ECOMMERCE_TABLES } from "@/lib/supabase/contract"

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260729000100_ecommerce_user_addresses.sql"),
  "utf8",
)

const addressColumns =
  /create table if not exists ecommerce\.user_addresses \(([^;]*)\);/.exec(migration)?.[1] ?? ""

const ownerPolicy =
  /create policy user_addresses_owner_read_write on ecommerce\.user_addresses([^;]*);/.exec(
    migration,
  )?.[1] ?? ""

describe("the saved address book is registered in the ecommerce contract", () => {
  it("maps userAddresses to the table the migration creates", () => {
    expect(ECOMMERCE_TABLES.userAddresses).toBe("user_addresses")
    expect(migration).toContain("create table if not exists ecommerce.user_addresses")
  })
})

// The two decisions that make this table safe live only in SQL: the book is
// global per person (no store scoping) and one default per person is a database
// invariant instead of a rule every writer has to remember. TypeScript cannot
// see either, so the migration text is what pins them.
describe("ecommerce.user_addresses invariants", () => {
  it("keys every row on the person, never on a store", () => {
    expect(addressColumns).toContain(
      "user_id uuid not null references auth.users(id) on delete cascade",
    )
    expect(addressColumns).not.toContain("store_id")
  })

  it("makes a second default unrepresentable with a partial unique index", () => {
    expect(migration).toContain(
      "create unique index if not exists user_addresses_single_default_per_user on ecommerce.user_addresses (user_id) where is_default;",
    )
  })

  it("restricts reads and writes to the owner, with no admin branch", () => {
    expect(ownerPolicy).toContain("using (user_id = (select auth.uid()))")
    expect(ownerPolicy).toContain("with check (user_id = (select auth.uid()))")
    expect(ownerPolicy).not.toContain("is_global_admin")
  })

  it.each(["label", "address_line_1", "city", "postal_code", "country", "is_default"])(
    "carries %s so a saved address can satisfy the checkout",
    (column) => {
      expect(addressColumns).toContain(column)
    },
  )

  it("puts the phone on the global profile instead of on the address", () => {
    expect(addressColumns).not.toContain("phone")
    expect(migration).toContain(
      "alter table ecommerce.user_profiles add column if not exists phone text;",
    )
  })
})

// A column-level revoke cannot narrow a table-level grant, so the only shape that
// actually closes the escalation is: drop the table privilege, then re-grant the
// safe columns. Someone will eventually try to collapse that pair back into a
// `revoke update (role)` one-liner, which reports success and changes nothing.
// These assertions pin the pair and the columns, never the prose around it.
describe("ecommerce.user_profiles privilege narrowing", () => {
  const writableByOwner = ["email", "first_name", "last_name", "phone", "updated_at"]
  const readableByAnon = [
    "id",
    "email",
    "first_name",
    "last_name",
    "phone",
    "created_at",
    "updated_at",
  ]
  const privilegedColumns = ["role", "must_change_password", "signup_store_id"]

  const grantedColumns = (privilege: "update" | "select", role: "authenticated" | "anon") =>
    new RegExp(
      `revoke ${privilege} on ecommerce\\.user_profiles from ${role};\\s*` +
        `grant ${privilege} \\(([^)]*)\\)\\s*on ecommerce\\.user_profiles to ${role};`,
    )
      .exec(migration)?.[1]
      .split(",")
      .map((column) => column.trim())

  it("drops the table-level update before re-granting the owner's own columns", () => {
    expect(grantedColumns("update", "authenticated")).toEqual(writableByOwner)
  })

  it("drops the table-level select before re-granting what a visitor may read", () => {
    expect(grantedColumns("select", "anon")).toEqual(readableByAnon)
  })

  it.each(privilegedColumns)("never lets a customer write %s", (column) => {
    expect(grantedColumns("update", "authenticated")).not.toContain(column)
    expect(grantedColumns("select", "anon")).not.toContain(column)
  })
})
