const DEFAULT_STORE_SUBDOMAIN = "default";
const LOCALHOST_SUFFIX = ".localhost";

function normalizeHostname(host: string | null | undefined): string {
  const trimmedHost = host?.trim().toLowerCase() ?? "";
  if (!trimmedHost) return "";

  const parsedHostname = parseUrlHostname(trimmedHost);
  const hostname = parsedHostname ?? trimmedHost;

  if (hostname.startsWith("[")) {
    const closingBracketIndex = hostname.indexOf("]");
    return closingBracketIndex === -1
      ? hostname
      : hostname.slice(1, closingBracketIndex);
  }

  const hostWithoutPort = hostname.includes(":")
    ? hostname.split(":")[0]
    : hostname;

  return hostWithoutPort.replace(/\.$/, "");
}

function parseUrlHostname(host: string): string | null {
  try {
    return new URL(host).hostname || null;
  } catch {
    return null;
  }
}

function isIpv4Address(hostname: string): boolean {
  const parts = hostname.split(".");
  return (
    parts.length === 4 &&
    parts.every((part) => {
      if (!/^\d+$/.test(part)) return false;
      const value = Number(part);
      return value >= 0 && value <= 255;
    })
  );
}

function isLocalHostname(hostname: string): boolean {
  return (
    hostname === "localhost" || hostname === "::1" || isIpv4Address(hostname)
  );
}

/**
 * Resolves a real store subdomain from a raw Host header or hostname.
 * Local development hosts and IP addresses intentionally return null so callers
 * can fall back to the default store instead of treating IP octets as tenants.
 */
export function resolveStoreSubdomain(
  host: string | null | undefined,
): string | null {
  const hostname = normalizeHostname(host);
  if (!hostname || isLocalHostname(hostname)) return null;

  if (hostname.endsWith(LOCALHOST_SUFFIX)) {
    const localSubdomain = hostname.slice(0, -LOCALHOST_SUFFIX.length);
    return localSubdomain ? localSubdomain.split(".")[0] : null;
  }

  const parts = hostname.split(".");
  const isVercelDomain =
    parts.length >= 2 &&
    parts[parts.length - 2] === "vercel" &&
    parts[parts.length - 1] === "app";

  if (isVercelDomain) {
    if (parts.length === 3) return null;
    if (parts.length >= 4) return parts[0];
  }

  if (parts.length >= 2) {
    const subdomain = parts[0];

    if (subdomain === "www") {
      return parts.length > 2 ? parts[1] : null;
    }

    if (parts.length === 2) return null;

    return subdomain;
  }

  return null;
}

export function resolveStoreLookupSubdomain(
  host: string | null | undefined,
): string {
  return resolveStoreSubdomain(host) ?? DEFAULT_STORE_SUBDOMAIN;
}

// The platform console lives on the reserved `admin` label (never a store:
// lib/stores/schemas.ts RESERVED_SUBDOMAINS keeps it off tenants).
const PLATFORM_ADMIN_SUBDOMAIN = "admin";

const DNS_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isPlatformAdminHost(host: string | null | undefined): boolean {
  return resolveStoreSubdomain(host) === PLATFORM_ADMIN_SUBDOMAIN;
}

/**
 * The deployment's root host: the current host with any storefront label
 * (store subdomain, `www`, the `admin` console label) stripped, port preserved.
 * Local hosts and IPs collapse to `localhost` so `admin.<root>` keeps resolving
 * to loopback in development.
 */
export function resolveDeploymentRootHost(
  host: string | null | undefined,
): string {
  const rawHost = host?.trim().toLowerCase() ?? "";
  const port = extractPort(rawHost);
  const rootHostname = stripStorefrontLabels(normalizeHostname(rawHost));
  return port ? `${rootHostname}:${port}` : rootHostname;
}

/**
 * The platform console host derived from the current one, port preserved:
 * tienda2.localhost:3000 → admin.localhost:3000, www.dominio.com →
 * admin.dominio.com, tienda2.<proyecto>.vercel.app → admin.<proyecto>.vercel.app.
 */
export function toPlatformAdminHost(host: string | null | undefined): string {
  return `${PLATFORM_ADMIN_SUBDOMAIN}.${resolveDeploymentRootHost(host)}`;
}

/**
 * A tenant's own host derived from the current one, port preserved:
 * admin.localhost:3000 + "tienda2" → tienda2.localhost:3000,
 * admin.osoria.help + "default" → default.osoria.help. The mirror of
 * toPlatformAdminHost: every cookie here is host-only, so a store is entered by
 * going to its own host, never by setting something on the console's.
 */
export function toStoreHost(
  subdomain: string,
  host: string | null | undefined,
): string {
  const label = subdomain.trim().toLowerCase();
  if (!DNS_LABEL_PATTERN.test(label)) {
    throw new Error("The tenant subdomain must be a validated DNS label.");
  }

  return `${label}.${resolveDeploymentRootHost(host)}`;
}

function stripStorefrontLabels(hostname: string): string {
  if (!hostname || isLocalHostname(hostname)) return "localhost";

  const withoutWww = hostname.startsWith("www.")
    ? hostname.slice("www.".length)
    : hostname;
  const subdomain = resolveStoreSubdomain(withoutWww);
  return subdomain ? withoutWww.slice(`${subdomain}.`.length) : withoutWww;
}

function extractPort(rawHost: string): string | null {
  const bracketEnd = rawHost.indexOf("]");
  const portSeparatorIndex = rawHost.indexOf(":", bracketEnd + 1);
  if (portSeparatorIndex === -1) return null;

  const port = rawHost.slice(portSeparatorIndex + 1);
  return /^\d+$/.test(port) ? port : null;
}
