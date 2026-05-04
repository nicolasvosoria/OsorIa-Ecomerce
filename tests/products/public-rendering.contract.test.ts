import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { PRODUCT_AI_DETAILS_METADATA_KEY } from "@/lib/types/products";

describe("public product rendering contract", () => {
  it("filters private ai_details before rendering product metadata/specifications", () => {
    const pageSource = readFileSync("app/products/[slug]/page.tsx", "utf8");

    expect(PRODUCT_AI_DETAILS_METADATA_KEY).toBe("ai_details");
    expect(pageSource).toContain("publicMetadataEntries");
    expect(pageSource).toContain("key !== PRODUCT_AI_DETAILS_METADATA_KEY");
    expect(pageSource).toContain("publicRelatedProducts");
    expect(pageSource).toContain("<RelatedProductsCarousel products={publicRelatedProducts} />");
    expect(pageSource).not.toContain("Object.entries(product.metadata).map");
    expect(pageSource).not.toContain("<RelatedProductsCarousel products={relatedProducts} />");
  });
});
