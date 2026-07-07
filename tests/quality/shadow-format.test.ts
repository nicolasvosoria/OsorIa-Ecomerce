import { describe, expect, it } from "vitest";

import {
  composeBoxShadow,
  hexToShadowColor,
  isValidBoxShadow,
  parseBoxShadow,
  shadowColorToHex,
  type ShadowParts,
} from "@/lib/theme/shadow-format";

const PRESETS = [
  { value: "none", label: "Ninguna" },
  { value: "0 1px 3px rgba(0,0,0,.08)", label: "Sutil" },
  { value: "0 6px 16px -4px rgba(0,0,0,.16)", label: "Media" },
  { value: "0 16px 32px -8px rgba(0,0,0,.28)", label: "Marcada" },
] as const;

describe("parseBoxShadow", () => {
  it("returns null for the none sentinel", () => {
    expect(parseBoxShadow("none")).toBeNull();
  });

  it("parses the 3-length preset (no spread)", () => {
    expect(parseBoxShadow("0 1px 3px rgba(0,0,0,.08)")).toEqual({
      x: 0,
      y: 1,
      blur: 3,
      spread: 0,
      color: "rgb(0,0,0)",
      alpha: 0.08,
    });
  });

  it("parses the 4-length preset with negative spread", () => {
    expect(parseBoxShadow("0 6px 16px -4px rgba(0,0,0,.16)")).toEqual({
      x: 0,
      y: 6,
      blur: 16,
      spread: -4,
      color: "rgb(0,0,0)",
      alpha: 0.16,
    });
  });

  it("parses the marcada preset", () => {
    expect(parseBoxShadow("0 16px 32px -8px rgba(0,0,0,.28)")).toEqual({
      x: 0,
      y: 16,
      blur: 32,
      spread: -8,
      color: "rgb(0,0,0)",
      alpha: 0.28,
    });
  });

  it.each(["", "not a shadow", "0 1px 3px", "0 1px 3px 5px 7px rgba(0,0,0,.1)"])(
    "returns null for garbage input %s",
    (value) => {
      expect(parseBoxShadow(value)).toBeNull();
    },
  );
});

describe("composeBoxShadow", () => {
  it("always emits four lengths and an rgba color", () => {
    const parts: ShadowParts = { x: 0, y: 1, blur: 3, spread: 0, color: "rgb(0,0,0)", alpha: 0.08 };
    expect(composeBoxShadow(parts)).toBe("0px 1px 3px 0px rgba(0,0,0,0.08)");
  });
});

describe("round-trip", () => {
  it.each(PRESETS.filter((preset) => preset.value !== "none"))(
    "parse -> compose -> parse is stable for $label",
    (preset) => {
      const parsed = parseBoxShadow(preset.value) as ShadowParts;
      expect(parsed).not.toBeNull();

      const composed = composeBoxShadow(parsed);
      const reparsed = parseBoxShadow(composed);

      expect(reparsed).toEqual(parsed);
    },
  );

  it("parse(compose(parts)) deep-equals parts for an arbitrary custom shape", () => {
    const parts: ShadowParts = { x: 2, y: 4, blur: 12, spread: -2, color: "rgb(30,64,175)", alpha: 0.5 };
    expect(parseBoxShadow(composeBoxShadow(parts))).toEqual(parts);
  });
});

describe("isValidBoxShadow", () => {
  it.each(["none", "0 1px 3px rgba(0,0,0,.08)", "0 6px 16px -4px rgba(0,0,0,.16)"])(
    "accepts %s",
    (value) => {
      expect(isValidBoxShadow(value)).toBe(true);
    },
  );

  it.each(["", "not a shadow", "0 1px 3px"])("rejects %s", (value) => {
    expect(isValidBoxShadow(value)).toBe(false);
  });
});

describe("hex <-> shadow color conversion", () => {
  it("round-trips a hex color through the shadow color shape", () => {
    expect(hexToShadowColor("#1e40af")).toBe("rgb(30,64,175)");
    expect(shadowColorToHex("rgb(30,64,175)")).toBe("#1e40af");
  });
});
