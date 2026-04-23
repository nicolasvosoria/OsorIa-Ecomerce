import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");

function readPackageJson() {
  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf-8");

  return JSON.parse(packageJsonRaw) as {
    packageManager?: string;
    scripts?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
}

describe("H2 quality gates contract", () => {
  it("uses pnpm as the single package manager source of truth", () => {
    const pnpmLockPath = path.join(repoRoot, "pnpm-lock.yaml");
    const npmLockPath = path.join(repoRoot, "package-lock.json");
    const packageJson = readPackageJson();

    expect(fs.existsSync(pnpmLockPath)).toBe(true);
    expect(fs.existsSync(npmLockPath)).toBe(false);
    expect(packageJson.packageManager).toMatch(/^pnpm@/);
  });

  it("defines meaningful lint, typecheck, test and build scripts", () => {
    const packageJson = readPackageJson();
    const scripts = packageJson.scripts ?? {};

    expect(scripts.lint).toBe(
      "eslint app/api/store app/api/orders/send-confirmation-email lib/security tests/security tests/quality --max-warnings=0",
    );
    expect(scripts.typecheck).toBe("tsc --noEmit -p tsconfig.quality.json");
    expect(scripts.test).toBe("node scripts/run-vitest.mjs");
    expect(scripts.build).toBe("next build");
    expect(scripts["lint:full"]).toBe("eslint . --max-warnings=0");
    expect(scripts["typecheck:full"]).toBe("tsc --noEmit");
    expect(scripts["test:full"]).toBe("vitest run");
  });

  it("keeps eslint config resolvable for the lint gate", () => {
    const packageJson = readPackageJson();
    const devDependencies = packageJson.devDependencies ?? {};
    const eslintConfigNextVersion = devDependencies["eslint-config-next"];

    expect(typeof eslintConfigNextVersion).toBe("string");
    expect(eslintConfigNextVersion).toMatch(/^[~^]?\d+\.\d+\.\d+/);
  });
});
