import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const h5Path = path.join(
  repoRoot,
  ".atl/ecommerce-saneamiento-secuencial/h5-maintainability-standards.md",
);

function readH5Standards(): string {
  return fs.readFileSync(h5Path, "utf-8");
}

describe("H5 maintainability standards contract", () => {
  it("codifies maintainability and legibility standards tied to change risk", () => {
    const standards = readH5Standards();

    expect(standards).toContain("## Maintainability and Legibility Standards");
    expect(standards).toContain("Risk-reduction first");
    expect(standards).toContain("No cosmetic-only refactors in critical flows");
    expect(standards).toContain("Typed error handling over `any` catches");
  });

  it("prioritizes hotspots by blast radius and ambiguity", () => {
    const standards = readH5Standards();

    expect(standards).toContain("## Hotspot Prioritization Matrix");
    expect(standards).toContain(
      "app/api/orders/send-confirmation-email/route.ts",
    );
    expect(standards).toContain("app/checkout/page.tsx");
    expect(standards).toContain("config ambiguity");
  });

  it("captures incremental modularization slices and safety gates", () => {
    const standards = readH5Standards();

    expect(standards).toContain("## Incremental Modularization Slices");
    expect(standards).toContain("lib/security/email-runtime-guards.ts");
    expect(standards).toContain("Fallback Behavior Guardrails");
    expect(standards).toContain("Validation for H5");
  });
});
