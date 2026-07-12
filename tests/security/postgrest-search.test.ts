import { describe, expect, it } from "vitest";

import { sanitizeIlikeSearchTerm } from "@/lib/security/postgrest-search";

describe("sanitizeIlikeSearchTerm", () => {
  it("strips PostgREST .or() metacharacters", () => {
    expect(sanitizeIlikeSearchTerm("camisa,()%'\" azul")).toBe("camisa azul");
  });

  it("cannot inject an extra .or() clause", () => {
    const injected = "x%,item_name.ilike.%y";

    const sanitized = sanitizeIlikeSearchTerm(injected);

    expect(sanitized).not.toContain(",");
    expect(sanitized).not.toContain("%");
  });

  it("collapses repeated whitespace and trims", () => {
    expect(sanitizeIlikeSearchTerm("  camisa   azul  ")).toBe("camisa azul");
  });

  it("limits the term to 100 characters", () => {
    const longTerm = "a".repeat(150);

    expect(sanitizeIlikeSearchTerm(longTerm)).toHaveLength(100);
  });

  it("returns an empty string for non-string or nullish input", () => {
    expect(sanitizeIlikeSearchTerm(undefined)).toBe("");
    expect(sanitizeIlikeSearchTerm(null)).toBe("");
    expect(sanitizeIlikeSearchTerm(42)).toBe("");
  });
});
