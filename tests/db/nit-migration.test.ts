import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const migrationPath = path.join(
  repoRoot,
  "scripts",
  "39-fix-clientes-nit-text-safe.sql",
);

function readMigration() {
  return readFileSync(migrationPath, "utf-8");
}

describe("NIT migration contract", () => {
  it("uses the expected numbered migration file", () => {
    expect(existsSync(migrationPath)).toBe(true);
  });

  it("converts NIT to text with a preserving USING cast", () => {
    const sql = readMigration();

    expect(sql).toContain('USING "NIT"::text');
  });

  it("documents acceptance for long and hyphenated NIT examples", () => {
    const sql = readMigration();

    expect(sql).toContain("8909006089");
    expect(sql).toContain("890900608-9");
  });

  it("contains regex validation logic for normalized NIT text", () => {
    const sql = readMigration();

    expect(sql).toContain("^[0-9]+(-[0-9])?$");
  });

  it("includes idempotency guards for table/column/type checks", () => {
    const sql = readMigration();

    expect(sql).toContain("information_schema.tables");
    expect(sql).toContain("information_schema.columns");
    expect(sql).toContain("already text/varchar");
    expect(sql).toContain("RAISE NOTICE");
  });

  it("avoids destructive table or column drops", () => {
    const sql = readMigration().toUpperCase();

    expect(sql).not.toContain("DROP TABLE");
    expect(sql).not.toContain('DROP COLUMN "NIT"');
    expect(sql).not.toContain("DROP COLUMN NIT");
  });
});
