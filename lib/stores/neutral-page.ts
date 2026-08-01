// The proxy serves these notices by rewriting, so the browser URL stays on the
// storefront path and `usePathname()` never reports them: the only way a page
// can tell it is rendering a notice instead of a storefront is this request
// header (D3).
export const NEUTRAL_PAGE_HEADER = "x-osoria-neutral-page"

export const NEUTRAL_PAGE_KIND = {
  storeInactive: "store-inactive",
  storeNotFound: "store-not-found",
} as const

// A subdomain with no store behind it has no identity to propagate. Without an
// explicit marker "unknown tenant" is indistinguishable from "identity was never
// set", and the readers fall back to the store whose subdomain is `default` —
// which would render the notice wearing another tenant's identity.
export const UNKNOWN_TENANT_HEADER = "x-osoria-unknown-tenant"
export const UNKNOWN_TENANT_VALUE = "1"
