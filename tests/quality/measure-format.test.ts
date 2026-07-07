import { describe, expect, it } from "vitest";

import { isValidLength } from "@/lib/theme/measure-format";

describe("isValidLength", () => {
  it.each([
    ["0.75rem", true],
    ["12px", true],
    ["1.5em", true],
    ["0", true],
    ["0px", true],
    ["9999px", true],
    ["var(--radius)", true],
  ])("accepts %s", (value, expected) => {
    expect(isValidLength(value)).toBe(expected);
  });

  it.each([
    ["", false],
    ["abc", false],
    ["12", false],
    ["-1rem", false],
    ["10%", false],
    ["red", false],
  ])("rejects %s", (value, expected) => {
    expect(isValidLength(value)).toBe(expected);
  });
});
