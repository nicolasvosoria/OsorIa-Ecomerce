// Tokenizer decision: the color is located with a regex match ANYWHERE in
// the string (not by splitting on whitespace) so a color function's internal
// commas/spaces (`rgba(0, 0, 0, .16)`) never get mistaken for length tokens.
// Whatever text remains after removing the matched color is the length list,
// read in CSS's fixed order: offset-x, offset-y, blur, spread.
const COLOR_TOKEN_PATTERN = /rgba?\([^)]*\)|#[0-9a-fA-F]{3,8}\b/
const LENGTH_TOKEN_PATTERN = /^-?\d+(?:\.\d+)?px$/
const RGBA_PATTERN = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i
const HEX_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export interface ShadowParts {
  x: number
  y: number
  blur: number
  spread: number
  color: string
  alpha: number
}

interface ColorChannels {
  r: number
  g: number
  b: number
  alpha: number
}

function isLengthToken(token: string): boolean {
  return token === "0" || LENGTH_TOKEN_PATTERN.test(token)
}

function parseColorChannels(token: string): ColorChannels | null {
  const rgbaMatch = token.match(RGBA_PATTERN)
  if (rgbaMatch) {
    const [, r, g, b, alpha] = rgbaMatch
    return { r: Number(r), g: Number(g), b: Number(b), alpha: alpha === undefined ? 1 : Number(alpha) }
  }

  const hexMatch = token.match(HEX_PATTERN)
  if (!hexMatch) return null

  const hex = hexMatch[1]
  const isShortForm = hex.length <= 4
  const channel = (index: number) =>
    parseInt(isShortForm ? hex[index].repeat(2) : hex.slice(index * 2, index * 2 + 2), 16)
  const hasAlphaChannel = hex.length === 4 || hex.length === 8

  return { r: channel(0), g: channel(1), b: channel(2), alpha: hasAlphaChannel ? channel(3) / 255 : 1 }
}

/**
 * Parses a CSS `box-shadow` value into its editable parts. Returns `null` for
 * `"none"` (callers treat it as the empty/disabled state, not a shadow) and
 * for anything it cannot confidently tokenize — length count outside 2-4,
 * a non-px length, or a color it doesn't recognize (`rgb()`/`rgba()`/hex).
 */
export function parseBoxShadow(raw: string): ShadowParts | null {
  const trimmed = raw.trim()
  if (trimmed === "none") return null

  const colorMatch = trimmed.match(COLOR_TOKEN_PATTERN)
  if (!colorMatch) return null

  const colorToken = colorMatch[0]
  const colorChannels = parseColorChannels(colorToken)
  if (!colorChannels) return null

  const lengthsText = (trimmed.slice(0, colorMatch.index) + trimmed.slice((colorMatch.index ?? 0) + colorToken.length)).trim()
  const lengthTokens = lengthsText.split(/\s+/).filter(Boolean)
  if (lengthTokens.length < 2 || lengthTokens.length > 4 || !lengthTokens.every(isLengthToken)) return null

  const [x, y, blur = 0, spread = 0] = lengthTokens.map(parseFloat)
  const { r, g, b, alpha } = colorChannels

  return { x, y, blur, spread, color: `rgb(${r},${g},${b})`, alpha }
}

/**
 * Composes a canonical `box-shadow` value from its parts: always four
 * lengths plus an `rgba()` color, regardless of how the source shape (e.g. a
 * 3-length preset) originally omitted the spread or shortened the alpha.
 */
export function composeBoxShadow(parts: ShadowParts): string {
  const { r, g, b } = parseColorChannels(parts.color) ?? { r: 0, g: 0, b: 0 }
  return `${parts.x}px ${parts.y}px ${parts.blur}px ${parts.spread}px rgba(${r},${g},${b},${parts.alpha})`
}

export function isValidBoxShadow(value: string): boolean {
  return value === "none" || parseBoxShadow(value) !== null
}

/** Converts a shadow's `color` part (`rgb(r,g,b)` or hex) to a hex string, for the native color input. */
export function shadowColorToHex(color: string): string {
  const channels = parseColorChannels(color)
  if (!channels) return "#000000"
  const toHex = (channel: number) => channel.toString(16).padStart(2, "0")
  return `#${toHex(channels.r)}${toHex(channels.g)}${toHex(channels.b)}`
}

/** Converts a hex color (from the native color input) to the shadow's `color` part shape. */
export function hexToShadowColor(hex: string): string {
  const channels = parseColorChannels(hex)
  return channels ? `rgb(${channels.r},${channels.g},${channels.b})` : "rgb(0,0,0)"
}
