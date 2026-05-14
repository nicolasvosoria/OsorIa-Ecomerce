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
  delaySeconds: number;
  frequencyHours: number;
  visibleDurationSeconds: number;
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

export type HomeDiscountPopupAdminIssueCode =
  | "inactive"
  | "missing_title"
  | "missing_text"
  | "missing_cta_text"
  | "missing_coupon"
  | "missing_redirect_url"
  | "invalid_date_range"
  | "not_started"
  | "expired";

export interface HomeDiscountPopupAdminIssue {
  code: HomeDiscountPopupAdminIssueCode;
  message: string;
  action: string;
}

export interface HomeDiscountPopupAdminStatus {
  publishable: boolean;
  issues: HomeDiscountPopupAdminIssue[];
}

const DEFAULT_DELAY_SECONDS = 4;
const DEFAULT_FREQUENCY_HOURS = 24;
const DEFAULT_VISIBLE_DURATION_SECONDS = 15;
const MIN_DELAY_SECONDS = 3;
const MAX_DELAY_SECONDS = 5;
const MIN_FREQUENCY_HOURS = 1;
const MAX_FREQUENCY_HOURS = 24 * 30;
const MIN_VISIBLE_DURATION_SECONDS = 5;
const MAX_VISIBLE_DURATION_SECONDS = 120;

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

function padDateTimeSegment(value: number): string {
  return String(value).padStart(2, "0");
}

function normalizeLegacySeconds(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const seconds = Math.round(parsed / 1000);
  if (seconds < min || seconds > max) {
    return fallback;
  }

  return seconds;
}

function normalizeSecondsField(
  secondsValue: unknown,
  legacyMsValue: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const normalizedSeconds = normalizeNumber(secondsValue, NaN, min, max);
  if (Number.isFinite(normalizedSeconds)) {
    return normalizedSeconds;
  }

  return normalizeLegacySeconds(legacyMsValue, fallback, min, max);
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
    delaySeconds: normalizeSecondsField(
      typedSource.delaySeconds,
      typedSource.delayMs,
      DEFAULT_DELAY_SECONDS,
      MIN_DELAY_SECONDS,
      MAX_DELAY_SECONDS,
    ),
    frequencyHours: normalizeNumber(
      typedSource.frequencyHours,
      DEFAULT_FREQUENCY_HOURS,
      MIN_FREQUENCY_HOURS,
      MAX_FREQUENCY_HOURS,
    ),
    visibleDurationSeconds: normalizeSecondsField(
      typedSource.visibleDurationSeconds,
      typedSource.visibleDurationMs,
      DEFAULT_VISIBLE_DURATION_SECONDS,
      MIN_VISIBLE_DURATION_SECONDS,
      MAX_VISIBLE_DURATION_SECONDS,
    ),
    ctaMode,
  };
}

export function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return (
    [
      date.getFullYear(),
      padDateTimeSegment(date.getMonth() + 1),
      padDateTimeSegment(date.getDate()),
    ].join("-") +
    `T${padDateTimeSegment(date.getHours())}:${padDateTimeSegment(date.getMinutes())}`
  );
}

export function parseDateTimeLocalValue(value: string): string | null {
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
    String(config.delaySeconds),
    String(config.frequencyHours),
    String(config.visibleDurationSeconds),
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

  if (
    !config.active ||
    !hasValidCta(config) ||
    !config.title ||
    !config.text ||
    !config.ctaText
  ) {
    return null;
  }

  return {
    ...config,
    fingerprint: getHomeDiscountPopupFingerprint(config),
  };
}

export function validateHomeDiscountPopupAdminStatus(
  config: HomeDiscountPopupConfig,
  now: Date = new Date(),
): HomeDiscountPopupAdminStatus {
  const issues: HomeDiscountPopupAdminIssue[] = [];

  if (!config.active) {
    issues.push({
      code: "inactive",
      message: "El popup está desactivado.",
      action: "Activa el popup cuando quieras publicarlo en la home.",
    });
  }

  if (!config.title) {
    issues.push({
      code: "missing_title",
      message: "Falta el título del popup.",
      action: "Agrega un título visible para la campaña.",
    });
  }

  if (!config.text) {
    issues.push({
      code: "missing_text",
      message: "Falta el mensaje principal.",
      action: "Agrega el texto que verá el visitante.",
    });
  }

  if (!config.ctaText) {
    issues.push({
      code: "missing_cta_text",
      message: "Falta el texto del CTA.",
      action: "Agrega el texto del botón de la promo.",
    });
  }

  if (config.ctaMode === "redirect" && !config.ctaUrl) {
    issues.push({
      code: "missing_redirect_url",
      message: "El CTA de redirección no tiene una URL válida.",
      action: "Agrega una URL HTTPS para publicar este CTA.",
    });
  }

  if (config.ctaMode === "copy_coupon" && !config.coupon) {
    issues.push({
      code: "missing_coupon",
      message: "El CTA de copiar cupón no tiene código.",
      action: "Agrega un cupón o cambia el CTA a redirección con URL HTTPS.",
    });
  }

  const startsAt = config.startsAt ? new Date(config.startsAt) : null;
  const endsAt = config.endsAt ? new Date(config.endsAt) : null;

  if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
    issues.push({
      code: "invalid_date_range",
      message: "La fecha de inicio es posterior a la fecha de fin.",
      action:
        "Corrige las fechas de vigencia para que el inicio sea anterior al fin.",
    });
  } else if (config.active) {
    const timestamp = now.getTime();

    if (startsAt && timestamp < startsAt.getTime()) {
      issues.push({
        code: "not_started",
        message: "La campaña aún no comenzó.",
        action: "Ajusta la fecha de inicio si quieres publicarla ahora.",
      });
    }

    if (endsAt && timestamp > endsAt.getTime()) {
      issues.push({
        code: "expired",
        message: "La campaña ya finalizó.",
        action: "Extiende la fecha de fin o desactiva esta campaña.",
      });
    }
  }

  return {
    publishable: config.active && issues.length === 0,
    issues,
  };
}
