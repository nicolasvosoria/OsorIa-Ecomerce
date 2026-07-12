const EXTERNAL_LINK_PATTERN = /^https?:\/\//i

// True for an absolute http(s) URL — `story`'s CTA and `whyus`'s item links
// use this to decide between an external `<a target="_blank">` and an
// internal `<Link>`.
export function isExternalLink(href: string): boolean {
  return EXTERNAL_LINK_PATTERN.test(href)
}
