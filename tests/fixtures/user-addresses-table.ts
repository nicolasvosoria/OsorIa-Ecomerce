import type { SupabaseAuthClient } from "@/lib/supabase/server-auth-session"

export type AddressRow = {
  id: string
  user_id: string
  label: string | null
  address_line_1: string
  city: string | null
  postal_code: string | null
  country: string
  is_default: boolean
  created_at: string
  updated_at: string
}

type QueryResult = { data: AddressRow[] | null; error: { code: string; message: string } | null }

const SINGLE_DEFAULT_VIOLATION = {
  code: "23505",
  message:
    'duplicate key value violates unique constraint "user_addresses_single_default_per_user"',
}

const MULTIPLE_ROWS_RETURNED = {
  code: "PGRST116",
  message: "JSON object requested, multiple (or no) rows returned",
}

type Filter = { column: keyof AddressRow; value: unknown; negated: boolean }
type Sort = { column: keyof AddressRow; ascending: boolean }

type Operation =
  | { kind: "read" }
  | { kind: "insert"; values: Partial<AddressRow> }
  | { kind: "update"; patch: Partial<AddressRow> }
  | { kind: "delete" }

// Doble de ecommerce.user_addresses que hace cumplir el índice parcial
// user_addresses_single_default_per_user: una escritura que dejaría dos
// predeterminadas de la misma persona no se aplica y vuelve como error 23505,
// igual que en Postgres. Sin eso, una implementación que marcara la nueva antes
// de despejar la anterior pasaría los tests y fallaría en producción.
export function createUserAddressesTable(seed: AddressRow[]) {
  let rows = seed.map((row) => ({ ...row }))
  let writes = 0
  const knownUsers = new Set(seed.map((row) => row.user_id))
  const defaultCounts = new Map<string, number[]>()

  function recordDefaultCounts(state: AddressRow[]): void {
    for (const row of state) {
      knownUsers.add(row.user_id)
    }
    for (const userId of knownUsers) {
      const defaults = state.filter((row) => row.user_id === userId && row.is_default).length
      defaultCounts.set(userId, [...(defaultCounts.get(userId) ?? []), defaults])
    }
  }

  function commit(next: AddressRow[]): QueryResult["error"] {
    const defaultsPerUser = next.filter((row) => row.is_default)
    const owners = new Set(defaultsPerUser.map((row) => row.user_id))
    if (owners.size < defaultsPerUser.length) {
      return SINGLE_DEFAULT_VIOLATION
    }

    rows = next
    recordDefaultCounts(next)
    return null
  }

  function query(operation: Operation) {
    const filters: Filter[] = []
    const sorts: Sort[] = []
    let take: number | null = null
    let returning = false

    const matches = (row: AddressRow) =>
      filters.every(({ column, value, negated }) =>
        negated ? row[column] !== value : row[column] === value,
      )

    function run(): QueryResult {
      if (operation.kind === "read") {
        const found = [...rows.filter(matches)].sort(bySorts(sorts))
        return { data: take === null ? found : found.slice(0, take), error: null }
      }

      if (operation.kind === "insert") {
        writes += 1
        const created = {
          ...operation.values,
          id: operation.values.id ?? `generated-${writes}`,
          created_at: operation.values.created_at ?? `2026-07-30T00:00:0${writes}Z`,
          updated_at: operation.values.updated_at ?? `2026-07-30T00:00:0${writes}Z`,
        } as AddressRow
        const error = commit([...rows, created])
        return { data: error ? null : returning ? [created] : null, error }
      }

      const touched = rows.filter(matches).map((row) => row.id)
      const next =
        operation.kind === "delete"
          ? rows.filter((row) => !touched.includes(row.id))
          : rows.map((row) => (touched.includes(row.id) ? { ...row, ...operation.patch } : row))
      const affected =
        operation.kind === "delete"
          ? rows.filter((row) => touched.includes(row.id))
          : next.filter((row) => touched.includes(row.id))

      const error = commit(next)
      return { data: error ? null : returning ? affected : null, error }
    }

    const builder = {
      eq(column: keyof AddressRow, value: unknown) {
        filters.push({ column, value, negated: false })
        return builder
      },
      neq(column: keyof AddressRow, value: unknown) {
        filters.push({ column, value, negated: true })
        return builder
      },
      order(column: keyof AddressRow, options?: { ascending?: boolean }) {
        sorts.push({ column, ascending: options?.ascending ?? true })
        return builder
      },
      limit(count: number) {
        take = count
        return builder
      },
      select() {
        returning = true
        return builder
      },
      maybeSingle() {
        const result = run()
        if (result.error || !result.data) {
          return Promise.resolve({ data: null, error: result.error })
        }
        if (result.data.length > 1) {
          return Promise.resolve({ data: null, error: MULTIPLE_ROWS_RETURNED })
        }
        return Promise.resolve({ data: result.data[0] ?? null, error: null })
      },
      then(onFulfilled: (result: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) {
        return Promise.resolve(run()).then(onFulfilled, onRejected)
      },
    }

    return builder
  }

  const table = {
    select: () => query({ kind: "read" }).select(),
    insert: (values: Partial<AddressRow>) => query({ kind: "insert", values }),
    update: (patch: Partial<AddressRow>) => query({ kind: "update", patch }),
    delete: () => query({ kind: "delete" }),
  }

  const client = {
    schema: (schema: string) => ({
      from: (name: string) => {
        if (schema !== "ecommerce" || name !== "user_addresses") {
          throw new Error(`Consulta inesperada contra ${schema}.${name}`)
        }
        return table
      },
    }),
  }

  return {
    client: client as unknown as SupabaseAuthClient,
    rows: () => rows.map((row) => ({ ...row })),
    // Cuántas predeterminadas tuvo la persona tras cada escritura aplicada: es
    // lo que deja ver si un cambio de predeterminada abrió un hueco sin ninguna
    // o llegó a intentar dos.
    defaultCountsAfterEachWrite: (userId: string) => defaultCounts.get(userId) ?? [],
  }
}

function bySorts(sorts: Sort[]) {
  return (left: AddressRow, right: AddressRow) => {
    for (const { column, ascending } of sorts) {
      const before = left[column] ?? ""
      const after = right[column] ?? ""
      if (before === after) {
        continue
      }
      const order = before < after ? -1 : 1
      return ascending ? order : -order
    }
    return 0
  }
}
