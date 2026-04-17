import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../..");
const cartContextPath = path.join(repoRoot, "contexts/cart-context.tsx");

function readCartContextSource(): string {
  return fs.readFileSync(cartContextPath, "utf-8");
}

describe("H6 cart mutation automated smoke contract", () => {
  it("keeps explicit cart mutation operations in the cart context", () => {
    const source = readCartContextSource();

    expect(source).toContain("const addToCart =");
    expect(source).toContain("const removeFromCart =");
    expect(source).toContain("const updateQuantity =");
    expect(source).toContain("const getTotal =");
  });

  it("keeps zero-or-negative quantity protection via remove flow", () => {
    const source = readCartContextSource();

    expect(source).toContain("if (quantity <= 0)");
    expect(source).toContain("removeFromCart(id)");
  });
});
