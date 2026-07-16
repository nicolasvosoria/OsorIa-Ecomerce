const MISSING_ADMIN_COOKIE_SECRET_MESSAGE =
  "ADMIN_COOKIE_SECRET is not set. Without it, verifyActiveStore() can never trust the " +
  "active-store cookie: the admin store switcher silently stops working and every " +
  "admin request falls back to resolving the store from the request host. Set " +
  "ADMIN_COOKIE_SECRET before starting the app in production (see .env.example; " +
  "generate one with `openssl rand -hex 32`)."

export interface ProductionEnvSnapshot {
  nodeEnv: string | undefined
  adminCookieSecret: string | undefined
}

export function assertAdminCookieSecretConfigured({
  nodeEnv,
  adminCookieSecret,
}: ProductionEnvSnapshot): void {
  if (nodeEnv !== "production" || adminCookieSecret) {
    return
  }

  throw new Error(MISSING_ADMIN_COOKIE_SECRET_MESSAGE)
}
