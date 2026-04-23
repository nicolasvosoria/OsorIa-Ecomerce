import { sanitizePublicUrl } from "@/lib/security/html-sanitization";

export type HomeDiscountPopupCtaMode = "redirect" | "copy_coupon";

export interface HomeDiscountPopupConfig {
  active: boolean;
  title: string;
  text: string;
  imageUrl: string | null;
  ctaText: string;
  ctaUrl: string | null;
  coupon: string;
  startsAt: string | null;
  endsAt: string | null;
  delayMs: number;
  frequencyHours: number;
  visibleDurationMs: number;
  ctaMode: HomeDiscountPopupCtaMode;
}

export interface PublicHomeDiscountPopupConfig extends HomeDiscountPopupConfig {
  fingerprint: string;
}

export interface HomeDiscountPopupEligibilityInput {
  config: HomeDiscountPopupConfig;
  pathname: string;
  now: Date;
  storageKey: string;
  storageSnapshot: Record<string, string | null | undefined>;
}

export interface HomeDiscountPopupEligibilityResult {
  eligible: boolean;
  reason?: "inactive" | "route" | "schedule" | "cooldown" | "invalid_cta";
}

const DEFAULT_DELAY_MS = 4000;
const DEFAULT_FREQUENCY_HOURS = 24;
const DEFAULT_VISIBLE_DURATION_MS = 15000;
const MIN_DELAY_MS = 3000;
const MAX_DELAY_MS = 5000;
const MIN_FREQUENCY_HOURS = 1;
const MAX_FREQUENCY_HOURS = 24 * 30;
const MIN_VISIBLE_DURATION_MS = 5000;
const MAX_VISIBLE_DURATION_MS = 120000;

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < min || parsed > max) {
    return fallback;
  }

  return parsed;
}

function normalizeDateString(value: unknown): string | null {
  const trimmed = asTrimmedString(value);
  if (!trimmed) {
    return null;
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function normalizeCtaMode(value: unknown): HomeDiscountPopupCtaMode {
  return value === "redirect" ? "redirect" : "copy_coupon";
}

function hasValidCta(config: HomeDiscountPopupConfig): boolean {
  if (config.ctaMode === "redirect") {
    return Boolean(config.ctaUrl);
  }

  return Boolean(config.coupon);
}

export function normalizeHomeDiscountPopupConfig(
  input: unknown,
): HomeDiscountPopupConfig {
  const source = input && typeof input === "object" ? input : {};
  const typedSource = source as Record<string, unknown>;
  const ctaMode = normalizeCtaMode(typedSource.ctaMode);

  return {
    active: Boolean(typedSource.active),
    title: asTrimmedString(typedSource.title),
    text: asTrimmedString(typedSource.text),
    imageUrl: sanitizePublicUrl(typedSource.imageUrl) || null,
    ctaText: asTrimmedString(typedSource.ctaText),
    ctaUrl: sanitizePublicUrl(typedSource.ctaUrl) || null,
    coupon: asTrimmedString(typedSource.coupon),
    startsAt: normalizeDateString(typedSource.startsAt),
    endsAt: normalizeDateString(typedSource.endsAt),
    delayMs: normalizeNumber(
      typedSource.delayMs,
      DEFAULT_DELAY_MS,
      MIN_DELAY_MS,
      MAX_DELAY_MS,
    ),
    frequencyHours: normalizeNumber(
      typedSource.frequencyHours,
      DEFAULT_FREQUENCY_HOURS,
      MIN_FREQUENCY_HOURS,
      MAX_FREQUENCY_HOURS,
    ),
    visibleDurationMs: normalizeNumber(
      typedSource.visibleDurationMs,
      DEFAULT_VISIBLE_DURATION_MS,
      MIN_VISIBLE_DURATION_MS,
      MAX_VISIBLE_DURATION_MS,
    ),
    ctaMode,
  };
}

export function isHomeDiscountPopupPath(pathname: string): boolean {
  return pathname === "/";
}

export function isHomeDiscountPopupWithinSchedule(
  config: Pick<HomeDiscountPopupConfig, "startsAt" | "endsAt">,
  now: Date,
): boolean {
  const timestamp = now.getTime();

  if (config.startsAt) {
    const startsAt = new Date(config.startsAt).getTime();
    if (timestamp < startsAt) {
      return false;
    }
  }

  if (config.endsAt) {
    const endsAt = new Date(config.endsAt).getTime();
    if (timestamp > endsAt) {
      return false;
    }
  }

  return true;
}

export function getHomeDiscountPopupFingerprint(
  config: HomeDiscountPopupConfig,
): string {
  const seed = [
    config.title,
    config.text,
    config.imageUrl ?? "",
    config.ctaText,
    config.ctaUrl ?? "",
    config.coupon,
    config.startsAt ?? "",
    config.endsAt ?? "",
    String(config.delayMs),
    String(config.frequencyHours),
    String(config.visibleDurationMs),
    config.ctaMode,
  ].join("|");

  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

export function getHomeDiscountPopupStorageKey(
  storeId: string,
  fingerprint: string,
): string {
  return `osoria.homeDiscountPopup.${storeId}.${fingerprint}`;
}

function getDismissedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as { dismissedAt?: unknown };
    return normalizeDateString(parsed.dismissedAt);
  } catch {
    return null;
  }
}

export function isHomeDiscountPopupEligible(
  input: HomeDiscountPopupEligibilityInput,
): HomeDiscountPopupEligibilityResult {
  const { config, pathname, now, storageKey, storageSnapshot } = input;

  if (!config.active) {
    return { eligible: false, reason: "inactive" };
  }

  if (!isHomeDiscountPopupPath(pathname)) {
    return { eligible: false, reason: "route" };
  }

  if (!isHomeDiscountPopupWithinSchedule(config, now)) {
    return { eligible: false, reason: "schedule" };
  }

  if (!hasValidCta(config)) {
    return { eligible: false, reason: "invalid_cta" };
  }

  const dismissedAt = getDismissedAt(storageSnapshot[storageKey]);
  if (!dismissedAt) {
    return { eligible: true };
  }

  const elapsedMs = now.getTime() - new Date(dismissedAt).getTime();
  const cooldownMs = config.frequencyHours * 60 * 60 * 1000;
  if (elapsedMs < cooldownMs) {
    return { eligible: false, reason: "cooldown" };
  }

  return { eligible: true };
}

export function projectPublicHomeDiscountPopupConfig(
  input: unknown,
): PublicHomeDiscountPopupConfig | null {
  const config = normalizeHomeDiscountPopupConfig(input);

  if (!config.active || !hasValidCta(config) || !config.title || !config.text) {
    return null;
  }

  return {
    ...config,
    fingerprint: getHomeDiscountPopupFingerprint(config),
  };
}
