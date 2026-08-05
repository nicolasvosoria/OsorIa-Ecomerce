const OSORIA_HELP_DOMAIN = "osoria.help";
const ADMIN_ORIGIN = `https://admin.${OSORIA_HELP_DOMAIN}`;
const SUBDOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function getTenantOrigin(validatedSubdomain: string): string {
  const subdomain = validatedSubdomain.trim().toLowerCase();

  if (!SUBDOMAIN_PATTERN.test(subdomain)) {
    throw new Error("The tenant subdomain must be a validated DNS label.");
  }

  return `https://${subdomain}.${OSORIA_HELP_DOMAIN}`;
}

export function getTenantUrl(validatedSubdomain: string, path: string): string {
  return new URL(normalizePath(path), getTenantOrigin(validatedSubdomain)).toString();
}

export function getAdminUrl(path: string): string {
  return new URL(normalizePath(path), ADMIN_ORIGIN).toString();
}

function normalizePath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Email links must use an application-relative path.");
  }

  return path;
}
