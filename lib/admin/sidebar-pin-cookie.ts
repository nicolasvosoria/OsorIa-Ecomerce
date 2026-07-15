export const SIDEBAR_PIN_COOKIE = "sidebar_state"

const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7

// Solo el pin se persiste: el peek es hover y muere con el puntero. Sin cookie
// la barra arranca fijada.
export function isSidebarPinned(cookieValue: string | undefined): boolean {
  return cookieValue !== "false"
}

export function sidebarPinCookie(pinned: boolean): string {
  return `${SIDEBAR_PIN_COOKIE}=${pinned}; path=/; max-age=${ONE_WEEK_IN_SECONDS}`
}
