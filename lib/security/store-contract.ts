export type StoreLookupResult =
  | { kind: "subdomain"; value: string }
  | { kind: "id"; value: string }
  | { kind: "invalid"; error: string; status: number };

import { projectPublicHomeDiscountPopupConfig } from "@/lib/home-discount-popup";

export interface PublicStorePayload {
  id: string;
  subdomain: string;
  store_name: string;
  domain: string | null;
  is_active: boolean;
  is_public: boolean;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  currency_code: string | null;
  homeDiscountPopup?: ReturnType<typeof projectPublicHomeDiscountPopupConfig>;
}

const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PUBLIC_STORE_SELECT =
  "id, subdomain, store_name, domain, is_active, is_public, logo_url, primary_color, secondary_color, currency_code, metadata";

export function parseStoreLookupParams(
  searchParams: URLSearchParams,
): StoreLookupResult {
  const subdomain = searchParams.get("subdomain")?.trim();
  const id = searchParams.get("id")?.trim();

  if (subdomain) {
    if (!SUBDOMAIN_PATTERN.test(subdomain)) {
      return {
        kind: "invalid",
        error: "subdomain inválido",
        status: 400,
      };
    }

    return {
      kind: "subdomain",
      value: subdomain.toLowerCase(),
    };
  }

  if (id) {
    if (!UUID_PATTERN.test(id)) {
      return {
        kind: "invalid",
        error: "id inválido",
        status: 400,
      };
    }

    return {
      kind: "id",
      value: id,
    };
  }

  return {
    kind: "invalid",
    error: "Se requiere subdomain o id",
    status: 400,
  };
}

export function toPublicStorePayload(
  input: Record<string, any>,
): PublicStorePayload {
  const popupConfig = projectPublicHomeDiscountPopupConfig(
    input.metadata?.homeDiscountPopup,
  );

  return {
    id: String(input.id ?? ""),
    subdomain: String(input.subdomain ?? ""),
    store_name: String(input.store_name ?? ""),
    domain: input.domain ? String(input.domain) : null,
    is_active: Boolean(input.is_active),
    is_public: Boolean(input.is_public),
    logo_url: input.logo_url ? String(input.logo_url) : null,
    primary_color: input.primary_color ? String(input.primary_color) : null,
    secondary_color: input.secondary_color
      ? String(input.secondary_color)
      : null,
    currency_code: input.currency_code ? String(input.currency_code) : null,
    ...(popupConfig ? { homeDiscountPopup: popupConfig } : {}),
  };
}
