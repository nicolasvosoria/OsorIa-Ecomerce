import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
    expect(readme).not.toContain(".env.example");
  });

  it("removes loose markdown notes from repository root", () => {
    const rootEntries = readdirSync(repoRoot);
    const rootMarkdownFiles = rootEntries.filter((entry) =>
      entry.endsWith(".md"),
    );

    expect(rootMarkdownFiles).toEqual(["README.md"]);
  });
});
