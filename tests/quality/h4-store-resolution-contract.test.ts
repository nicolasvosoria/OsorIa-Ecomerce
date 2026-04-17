import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const h4ContractPath = path.join(
  repoRoot,
  ".atl/ecommerce-saneamiento-secuencial/h4-store-resolution-contract.md",
);

function readH4Contract(): string {
  return fs.readFileSync(h4ContractPath, "utf-8");
}

describe("H4 tenant/store resolution contract", () => {
  it("traces the current tenant/store resolution flow end-to-end", () => {
    const contract = readH4Contract();

    expect(contract).toContain("## Current End-to-End Resolution Trace");
    expect(contract).toContain("proxy.ts");
    expect(contract).toContain("x-store-id");
    expect(contract).toContain("store_id");
    expect(contract).toContain("lib/utils/store.ts");
    expect(contract).toContain("lib/supabase/store-api.ts");
    expect(contract).toContain("lib/supabase/products-api.ts");
  });

  it("defines target contract, valid store states, and state outcomes", () => {
    const contract = readH4Contract();

    expect(contract).toContain("## Target Store Resolution Contract");
    expect(contract).toContain("## Valid Store States");
    expect(contract).toContain("ACTIVE_PUBLIC");
    expect(contract).toContain("ACTIVE_PRIVATE");
    expect(contract).toContain("INACTIVE");
    expect(contract).toContain("NOT_FOUND");
    expect(contract).toContain("SOFT_DELETED");
    expect(contract).toContain("RESOLUTION_ERROR");
  });

  it("documents schema and compatibility dependencies explicitly", () => {
    const contract = readH4Contract();

    expect(contract).toContain("## Schema and Compatibility Dependencies");
    expect(contract).toContain("stores_legacy");
    expect(contract).toContain("Accept-Profile: ecommerce");
    expect(contract).toContain("id");
    expect(contract).toContain("subdomain");
    expect(contract).toContain("is_active");
    expect(contract).toContain("deleted_at");
  });

  it("reduces ambiguity for fallback policy and propagation boundaries", () => {
    const contract = readH4Contract();

    expect(contract).toContain("## Fallback and Propagation Rules");
    expect(contract).toContain("No implicit fallback in write paths");
    expect(contract).toContain("x-store-id header");
    expect(contract).toContain("store_id cookie");
    expect(contract).toContain("Preserve active behavior");
  });

  it("documents explicit compatibility boundaries for known divergent helpers", () => {
    const contract = readH4Contract();

    expect(contract).toContain("## H4 Compatibility Exceptions (Documented)");
    expect(contract).toContain("app/api/chat/route.ts");
    expect(contract).toContain("app/api/chatbot-config/route.ts");
    expect(contract).toContain("lib/supabase/chatbot-api.ts");
    expect(contract).toContain("lib/utils/store-server.ts");
    expect(contract).toContain(
      "cookie-only read path with literal `default` fallback",
    );
    expect(contract).toContain("`stores` and `stores_legacy`");
  });

  it("pins non-expansion boundaries so later phases can safely migrate", () => {
    const contract = readH4Contract();

    expect(contract).toContain("No behavior expansion in H4");
    expect(contract).toContain(
      "Compatibility scope is read-path tenant resolution only",
    );
    expect(contract).toContain(
      "Write-path tenant mutation remains explicit-only",
    );
    expect(contract).toContain("Migration target for later phases");
  });
});
