import {
  normalizeThemeRecord,
  type RuntimeTheme,
} from "@/lib/theme-font/runtime-contract";
import type { ThemeMode } from "@/lib/types/theme";
import type { HomeSectionEntry } from "@/lib/supabase/types";
import { resolveShopConfig, type ShopConfig } from "@/lib/shop/shop-config";

export const THEME_PREVIEW_QUERY_PARAM = "themePreview";
export const THEME_PREVIEW_MESSAGE_SOURCE = "osoria-theme-preview";

export interface ThemePreviewMessage {
  source: typeof THEME_PREVIEW_MESSAGE_SOURCE;
  theme: RuntimeTheme;
  mode: ThemeMode;
}

/**
 * True when the storefront is running inside the `/admin/theme` customizer
 * iframe (`?themePreview=1`). Callers use this to suppress applying the
 * persisted theme so the parent's ephemeral edits are the only thing ever
 * rendered — never toggled anywhere else, so normal loads are unaffected.
 */
export function isThemePreviewMode(): boolean {
  if (typeof window === "undefined") return false;
  return (
    new URLSearchParams(window.location.search).get(
      THEME_PREVIEW_QUERY_PARAM,
    ) === "1"
  );
}

export function parseThemePreviewMessage(
  data: unknown,
): ThemePreviewMessage | null {
  if (typeof data !== "object" || data === null) return null;

  const raw = data as Record<string, unknown>;
  if (raw.source !== THEME_PREVIEW_MESSAGE_SOURCE) return null;
  if (raw.mode !== "light" && raw.mode !== "dark") return null;

  const theme = normalizeThemeRecord(raw.theme);
  if (!theme) return null;

  return { source: THEME_PREVIEW_MESSAGE_SOURCE, theme, mode: raw.mode };
}

export const THEME_PREVIEW_FONT_SOURCE = "osoria-font-preview";

export interface ThemePreviewFontMessage {
  source: typeof THEME_PREVIEW_FONT_SOURCE;
  pairing: Record<string, unknown>;
}

/**
 * The pairing is re-validated by `applyRuntimePairing`/`normalizePairingRecord`
 * before it touches the DOM, so this only confirms the payload's shape.
 */
export function parseThemePreviewFontMessage(
  data: unknown,
): ThemePreviewFontMessage | null {
  if (typeof data !== "object" || data === null) return null;

  const raw = data as Record<string, unknown>;
  if (raw.source !== THEME_PREVIEW_FONT_SOURCE) return null;

  const pairing = raw.pairing;
  if (typeof pairing !== "object" || pairing === null) return null;
  if (typeof (pairing as Record<string, unknown>).pairing_name !== "string") {
    return null;
  }

  return {
    source: THEME_PREVIEW_FONT_SOURCE,
    pairing: pairing as Record<string, unknown>,
  };
}

export const THEME_PREVIEW_SELECT_SOURCE = "osoria-theme-select";

export interface ThemePreviewSelectMessage {
  source: typeof THEME_PREVIEW_SELECT_SOURCE;
  componentName: string;
}

export function parseThemePreviewSelectMessage(
  data: unknown,
): ThemePreviewSelectMessage | null {
  if (typeof data !== "object" || data === null) return null;

  const raw = data as Record<string, unknown>;
  if (raw.source !== THEME_PREVIEW_SELECT_SOURCE) return null;
  if (typeof raw.componentName !== "string" || raw.componentName === "") {
    return null;
  }

  return {
    source: THEME_PREVIEW_SELECT_SOURCE,
    componentName: raw.componentName,
  };
}

export const THEME_PREVIEW_SELECTION_SOURCE = "osoria-theme-selection";

export interface ThemePreviewSelectionMessage {
  source: typeof THEME_PREVIEW_SELECTION_SOURCE;
  componentName: string | null;
}

/** `componentName` of `null` means "clear selection". */
export function parseThemePreviewSelectionMessage(
  data: unknown,
): ThemePreviewSelectionMessage | null {
  if (typeof data !== "object" || data === null) return null;

  const raw = data as Record<string, unknown>;
  if (raw.source !== THEME_PREVIEW_SELECTION_SOURCE) return null;
  if (typeof raw.componentName !== "string" && raw.componentName !== null) {
    return null;
  }

  return {
    source: THEME_PREVIEW_SELECTION_SOURCE,
    componentName: raw.componentName,
  };
}

export const THEME_PREVIEW_CONTENT_SOURCE = "osoria-theme-content";

export interface ThemePreviewContentMessage {
  source: typeof THEME_PREVIEW_CONTENT_SOURCE;
  componentName: string;
  edits: Record<string, unknown>;
}

/**
 * The `edits` values are arbitrary content, re-validated downstream when
 * applied via `componentEdits`, so this only confirms `edits` is a plain object.
 */
export function parseThemePreviewContentMessage(
  data: unknown,
): ThemePreviewContentMessage | null {
  if (typeof data !== "object" || data === null) return null;

  const raw = data as Record<string, unknown>;
  if (raw.source !== THEME_PREVIEW_CONTENT_SOURCE) return null;
  if (typeof raw.componentName !== "string" || raw.componentName === "") {
    return null;
  }

  const edits = raw.edits;
  if (typeof edits !== "object" || edits === null || Array.isArray(edits)) {
    return null;
  }

  return {
    source: THEME_PREVIEW_CONTENT_SOURCE,
    componentName: raw.componentName,
    edits: edits as Record<string, unknown>,
  };
}

export const THEME_PREVIEW_COMPOSITION_SOURCE = "osoria-theme-composition";

export interface ThemePreviewCompositionMessage {
  source: typeof THEME_PREVIEW_COMPOSITION_SOURCE;
  composition: HomeSectionEntry[];
}

function isHomeSectionEntry(value: unknown): value is HomeSectionEntry {
  if (typeof value !== "object" || value === null) return false;

  const raw = value as Record<string, unknown>;
  return typeof raw.key === "string" && typeof raw.enabled === "boolean";
}

/**
 * The composition is re-applied as-is by `HomeComposition` (which already
 * skips entries with no matching section node), so this only confirms the
 * payload's shape: an array of `{ key: string; enabled: boolean }` entries.
 */
export function parseThemePreviewCompositionMessage(
  data: unknown,
): ThemePreviewCompositionMessage | null {
  if (typeof data !== "object" || data === null) return null;

  const raw = data as Record<string, unknown>;
  if (raw.source !== THEME_PREVIEW_COMPOSITION_SOURCE) return null;

  const composition = raw.composition;
  if (!Array.isArray(composition) || !composition.every(isHomeSectionEntry)) {
    return null;
  }

  return { source: THEME_PREVIEW_COMPOSITION_SOURCE, composition };
}

export const THEME_PREVIEW_SHOP_CONFIG_SOURCE = "osoria-shop-config-preview";

export interface ThemePreviewShopConfigMessage {
  source: typeof THEME_PREVIEW_SHOP_CONFIG_SOURCE;
  config: ShopConfig;
}

/**
 * The config is re-validated through `resolveShopConfig` — the same coercion
 * `getShopConfig` applies to a stored row — so a malformed preview payload
 * safely resolves to the full defaults instead of reaching the storefront
 * untyped.
 */
export function parseThemePreviewShopConfigMessage(
  data: unknown,
): ThemePreviewShopConfigMessage | null {
  if (typeof data !== "object" || data === null) return null;

  const raw = data as Record<string, unknown>;
  if (raw.source !== THEME_PREVIEW_SHOP_CONFIG_SOURCE) return null;

  return {
    source: THEME_PREVIEW_SHOP_CONFIG_SOURCE,
    config: resolveShopConfig(raw.config),
  };
}
