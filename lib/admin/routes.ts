export type AdminBreadcrumbStep = {
  label: string
  href: string
}

// El label de una ruta de entidad no viaja en la URL (/admin/orders/<uuid>), así
// que lo aporta la página; el fallback cubre el render sin ese dato.
type AdminRoute =
  | { kind: "static"; label: string }
  | { kind: "entity"; fallbackLabel: string }

const DYNAMIC_SEGMENT = ":id"

const ADMIN_ROUTES: Record<string, AdminRoute> = {
  "/admin": { kind: "static", label: "Admin" },
  "/admin/orders": { kind: "static", label: "Pedidos" },
  [`/admin/orders/${DYNAMIC_SEGMENT}`]: { kind: "entity", fallbackLabel: "Pedido" },
  "/admin/products": { kind: "static", label: "Productos" },
  "/admin/products/categories": { kind: "static", label: "Categorías" },
  "/admin/products/categories/create": { kind: "static", label: "Crear" },
  [`/admin/products/categories/${DYNAMIC_SEGMENT}/edit`]: { kind: "static", label: "Editar" },
  "/admin/products/combos": { kind: "static", label: "Combos" },
  "/admin/products/combos/create": { kind: "static", label: "Crear" },
  [`/admin/products/combos/${DYNAMIC_SEGMENT}/edit`]: { kind: "static", label: "Editar" },
  "/admin/products/create": { kind: "static", label: "Crear" },
  [`/admin/products/${DYNAMIC_SEGMENT}/edit`]: { kind: "static", label: "Editar" },
  "/admin/users": { kind: "static", label: "Usuarios" },
  "/admin/stats": { kind: "static", label: "Estadísticas" },
  "/admin/chatbot": { kind: "static", label: "Chatbot" },
  "/admin/home-discount-popup": { kind: "static", label: "Popup" },
  "/admin/settings": { kind: "static", label: "Configuración" },
  "/admin/settings/shipping": { kind: "static", label: "Envío" },
  "/admin/settings/shipping/zones/new": { kind: "static", label: "Crear" },
  [`/admin/settings/shipping/zones/${DYNAMIC_SEGMENT}/edit`]: { kind: "static", label: "Editar" },
}

const DYNAMIC_ROUTE_PATTERNS = Object.keys(ADMIN_ROUTES).filter((pattern) =>
  pattern.includes(DYNAMIC_SEGMENT),
)

export function adminBreadcrumbTrail(pathname: string, entityLabel?: string): AdminBreadcrumbStep[] {
  const segments = toSegments(pathname)

  return segments.flatMap((_, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    const route = findRoute(href)
    return route ? [{ href, label: routeLabel(route, entityLabel) }] : []
  })
}

export function isRouteOrDescendant(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`)
}

function findRoute(href: string): AdminRoute | undefined {
  const exactRoute = ADMIN_ROUTES[href]
  if (exactRoute) return exactRoute

  const segments = toSegments(href)
  const pattern = DYNAMIC_ROUTE_PATTERNS.find((candidate) => matchesPattern(segments, candidate))
  return pattern ? ADMIN_ROUTES[pattern] : undefined
}

function matchesPattern(segments: string[], pattern: string): boolean {
  const patternSegments = toSegments(pattern)
  if (patternSegments.length !== segments.length) return false

  return patternSegments.every(
    (patternSegment, index) => patternSegment === DYNAMIC_SEGMENT || patternSegment === segments[index],
  )
}

function routeLabel(route: AdminRoute, entityLabel?: string): string {
  if (route.kind === "static") return route.label
  return entityLabel ?? route.fallbackLabel
}

function toSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean)
}
