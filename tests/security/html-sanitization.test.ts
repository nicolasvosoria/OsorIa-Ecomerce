import { describe, expect, it } from "vitest";

import {
  escapeHtml,
  sanitizePublicUrl,
} from "@/lib/security/html-sanitization";

describe("escapeHtml", () => {
  it("escapes critical HTML characters", () => {
    const input = `<script>alert('xss')</script> & \"test\"`;

    const output = escapeHtml(input);

    expect(output).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt; &amp; &quot;test&quot;",
    );
  });

  it("returns empty string for nullish values", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("sanitizePublicUrl", () => {
  it("allows https URLs", () => {
    expect(sanitizePublicUrl("https://cdn.example.com/a.png")).toBe(
      "https://cdn.example.com/a.png",
    );
  });

  it("blocks javascript protocol URLs", () => {
    expect(sanitizePublicUrl("javascript:alert(1)")).toBe("");
  });
});
