import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { badgeVariants } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

describe("shared action surfaces use theme contrast tokens", () => {
  it("destructive button foreground is resolved by the theme token", () => {
    const className = buttonVariants({ variant: "destructive" });

    expect(className).toContain("text-destructive-foreground");
    expect(className).not.toContain("text-white");
  });

  it("destructive badge foreground is resolved by the theme token", () => {
    const className = badgeVariants({ variant: "destructive" });

    expect(className).toContain("text-destructive-foreground");
    expect(className).not.toContain("text-white");
  });

  it("legacy public sale badge uses the destructive foreground token", () => {
    const source = readFileSync("components/product-card.tsx", "utf8");

    expect(source).toContain("bg-destructive text-destructive-foreground");
    expect(source).not.toContain("bg-destructive text-white");
  });
});
