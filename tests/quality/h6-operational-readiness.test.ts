import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const h1EvidencePath = path.join(
  repoRoot,
  ".atl/ecommerce-saneamiento-secuencial/h1-security-evidence.md",
);
const h2EvidencePath = path.join(
  repoRoot,
  ".atl/ecommerce-saneamiento-secuencial/h2-quality-evidence.md",
);
const h6ReadinessPath = path.join(
  repoRoot,
  ".atl/ecommerce-saneamiento-secuencial/h6-operational-readiness.md",
);

function readH6Readiness(): string {
  return fs.readFileSync(h6ReadinessPath, "utf-8");
}

describe("H6 operational readiness contract", () => {
  it("keeps H1/H2 accepted evidence available before H6 gate", () => {
    expect(fs.existsSync(h1EvidencePath)).toBe(true);
    expect(fs.existsSync(h2EvidencePath)).toBe(true);

    const h6Readiness = readH6Readiness();

    expect(h6Readiness).toContain("h1-security-evidence.md");
    expect(h6Readiness).toContain("h2-quality-evidence.md");
  });

  it("defines operativo as measurable ecommerce behavior", () => {
    const h6Readiness = readH6Readiness();

    expect(h6Readiness).toContain("## Operativo Definition");
    expect(h6Readiness).toContain("Store público resuelve y responde 200");
    expect(h6Readiness).toContain(
      "Checkout crea pedido sin interrumpir al cliente",
    );
    expect(h6Readiness).toContain(
      "Respuesta de email nunca expone errores internos",
    );
  });

  it("defines a critical-flow matrix with automated and manual smoke checks", () => {
    const h6Readiness = readH6Readiness();

    expect(h6Readiness).toContain("## Critical-Flow Matrix");
    expect(h6Readiness).toContain("Store discovery (/api/store)");
    expect(h6Readiness).toContain("Product visibility (catalog/detail)");
    expect(h6Readiness).toContain("Cart mutation (add/update/remove)");
    expect(h6Readiness).toContain("Checkout + order creation");
    expect(h6Readiness).toContain("Confirmation email dispatch contract");
    expect(h6Readiness).toContain("Automated Smoke Check");
    expect(h6Readiness).toContain("Manual Smoke Check");
    expect(h6Readiness).toContain("Phase Gate Rule");
  });

  it("uses explicit evidence-based continue/stop rules", () => {
    const h6Readiness = readH6Readiness();

    expect(h6Readiness).toContain("## Continuation Decision Rules");
    expect(h6Readiness).toContain("CONTINUE");
    expect(h6Readiness).toContain("STOP");
    expect(h6Readiness).toContain("100% automated smoke checks green");
    expect(h6Readiness).toContain("Repo-versioned QA evidence");
  });

  it("separates pre-phase automated gates from pre-merge manual sign-off", () => {
    const h6Readiness = readH6Readiness();

    expect(h6Readiness).toContain("## Gate Contract by Phase Boundary");
    expect(h6Readiness).toContain("Pre-Phase Automated Gate");
    expect(h6Readiness).toContain("Pre-Merge Manual Operational Gate");
    expect(h6Readiness).toContain("h6-manual-smoke-checklist.md");
    expect(h6Readiness).toContain("Repo-versioned QA evidence");
  });

  it("requires low-risk automated cart smoke evidence instead of N/A", () => {
    const h6Readiness = readH6Readiness();

    expect(h6Readiness).toContain(
      "tests/quality/h6-cart-mutation-smoke.test.ts",
    );
    expect(h6Readiness).not.toContain(
      "N/A in H6 (automated cart smoke not yet available in this lane)",
    );
  });
});
