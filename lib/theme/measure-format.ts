// Non-negative CSS length: a plain number followed by px/rem/em (e.g.
// "0.75rem", "12px"), matching the units the theme's radius/shape tokens use.
const LENGTH_PATTERN = /^\d+(\.\d+)?(px|rem|em)$/

/**
 * Validates the exact-value escape hatch for a radius/shape token. Beyond
 * the general `<number><unit>` shape, two literal values are also valid:
 * unitless `"0"` (CSS allows a bare zero length) and `"var(--radius)"` (the
 * button radius default, which follows the base radius token).
 */
export function isValidLength(value: string): boolean {
  return value === "0" || value === "var(--radius)" || LENGTH_PATTERN.test(value)
}
