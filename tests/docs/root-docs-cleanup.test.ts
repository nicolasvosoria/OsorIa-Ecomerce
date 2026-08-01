import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("root docs cleanup", () => {
  const repoRoot = resolve(process.cwd());

  it("keeps README as the durable root entrypoint guidance", () => {
    const readmePath = resolve(repoRoot, "README.md");
    const readme = readFileSync(readmePath, "utf8");

    expect(readme).toContain("## Setup");
    expect(readme).toContain("pnpm install");
    expect(readme).toContain("pnpm dev");
    expect(readme).toContain("pnpm test");
    expect(readme).toContain("## Environment Variables");
    expect(readme).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(readme).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(readme).toContain("## Deployment");
    expect(readme).toContain("tests/README.md");
    expect(readme).toContain("lib/email-templates/README.md");
    expect(readme).toContain(".env.example");
  });

  it("removes loose markdown notes from repository root", () => {
    const rootEntries = readdirSync(repoRoot);
    const rootMarkdownFiles = rootEntries.filter((entry) =>
      entry.endsWith(".md"),
    );

    // DESIGN.md and PRODUCT.md are not loose notes: they are the Impeccable
    // design-foundation records, read from the project root by spec (DESIGN.md
    // follows the official DESIGN.md format; PRODUCT.md is its product-truth
    // counterpart), sidecar at .impeccable/design.json. They are durable,
    // intended root-level artifacts, so they stay in the allowlist.
    expect(rootMarkdownFiles.sort()).toEqual([
      "AGENTS.md",
      "DESIGN.md",
      "PRODUCT.md",
      "README.md",
    ]);
  });
});
