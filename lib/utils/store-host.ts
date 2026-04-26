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
