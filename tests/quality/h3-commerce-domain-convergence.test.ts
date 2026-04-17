import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const h3ContractPath = path.join(
  repoRoot,
  ".atl/ecommerce-saneamiento-secuencial/h3-commerce-domain-convergence.md",
);

function readH3Contract(): string {
  return fs.readFileSync(h3ContractPath, "utf-8");
}

describe("H3 commerce domain convergence contract", () => {
  it("maps active commerce domain and current sources of truth", () => {
    const contract = readH3Contract();

    expect(contract).toContain("## Active Commerce Domain Map");
    expect(contract).toContain("Storefront discovery and catalog visibility");
    expect(contract).toContain("Cart mutation and persistence");
    expect(contract).toContain("Checkout, order creation, and confirmation");
    expect(contract).toContain("Source-of-Truth Matrix");
    expect(contract).toContain("app/shop/page.tsx");
    expect(contract).toContain("app/checkout/page.tsx");
    expect(contract).toContain("components/cart/cart-context.tsx");
    expect(contract).toContain("contexts/cart-context.tsx");
    expect(contract).toContain("lib/products/index.ts");
    expect(contract).toContain("lib/supabase/orders-api.ts");
  });

  it("defines a minimum viable target architecture with low blast radius", () => {
    const contract = readH3Contract();

    expect(contract).toContain("## Minimum Viable Target Architecture");
    expect(contract).toContain("CommerceCore");
    expect(contract).toContain("ResolutionGateway");
    expect(contract).toContain("CatalogGateway");
    expect(contract).toContain("CartGateway");
    expect(contract).toContain("CheckoutGateway");
    expect(contract).toContain(
      "Compatibility shell (current UI/API entrypoints)",
    );
    expect(contract).toContain(
      "No active storefront/cart/checkout behavior change in H3",
    );
  });

  it("converges duplicated flows/adapters through safe sequencing", () => {
    const contract = readH3Contract();

    expect(contract).toContain(
      "## Safe Convergence Plan (Duplicated Flows/Adapters)",
    );
    expect(contract).toContain(
      "Dual product-detail routes: /product/[handle] and /products/[slug]",
    );
    expect(contract).toContain("Dual cart providers in checkout");
    expect(contract).toContain("Store resolution duplicated across helpers");
    expect(contract).toContain("Single canonical store resolution adapter");
    expect(contract).toContain("Single checkout cart snapshot builder");
    expect(contract).toContain("Canonical product-detail resolver facade");
  });

  it("leaves explicit transition and deprecation path for legacy pieces", () => {
    const contract = readH3Contract();

    expect(contract).toContain("## Transition and Deprecation Path");
    expect(contract).toContain("stores_legacy");
    expect(contract).toContain("store_items_legacy");
    expect(contract).toContain("orders_legacy");
    expect(contract).toContain("Deprecation Stages");
    expect(contract).toContain("Stage 0 — Observe and freeze behavior");
    expect(contract).toContain(
      "Stage 1 — Introduce adapters without flipping callers",
    );
    expect(contract).toContain(
      "Stage 2 — Migrate callers behind parity checks",
    );
    expect(contract).toContain("Stage 3 — Deprecate legacy entrypoints");
    expect(contract).toContain(
      "Rollback rule: keep compatibility shell active",
    );
  });
});
