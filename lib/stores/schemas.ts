import { z } from "zod"

const REQUIRED_STORE_NAME_MESSAGE = "El nombre de la tienda es requerido"
const INVALID_SUBDOMAIN_MESSAGE =
  "Usa minúsculas, números y guiones (sin empezar ni terminar en guion) y máximo 63 caracteres"
const RESERVED_SUBDOMAIN_MESSAGE = "Ese subdominio está reservado por la plataforma. Elige otro."
const INVALID_EMAIL_MESSAGE = "Ingresa un correo válido"
const INVALID_CURRENCY_MESSAGE = "Usa un código ISO de 3 letras mayúsculas, por ejemplo COP"

// One DNS label: lowercase alphanumerics and hyphens, never leading/trailing with
// a hyphen, up to 63 chars. Case-folding is intentionally NOT applied — the host
// is lowercased in resolveStoreSubdomain, so a subdomain stored with uppercase
// could never match its store; forbidding uppercase keeps every stored value in
// the only shape the resolver can reach.
const SUBDOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])?$/

// Subdomains the platform already owns: `default` is the resolver's fallback,
// `www` is stripped before lookup (store-host.ts) so it is unreachable, and the
// rest name platform hosts a tenant must never shadow.
const RESERVED_SUBDOMAINS = new Set([
  "default",
  "www",
  "admin",
  "api",
  "app",
  "localhost",
  "staging",
  "preview",
  "assets",
  "static",
  "mail",
])

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/

export const createStoreSchema = z.object({
  storeName: z.string().trim().min(1, REQUIRED_STORE_NAME_MESSAGE),
  subdomain: z
    .string()
    .trim()
    .regex(SUBDOMAIN_PATTERN, INVALID_SUBDOMAIN_MESSAGE)
    .refine((subdomain) => !RESERVED_SUBDOMAINS.has(subdomain), RESERVED_SUBDOMAIN_MESSAGE),
  ownerEmail: z.string().trim().min(1, INVALID_EMAIL_MESSAGE).email(INVALID_EMAIL_MESSAGE),
  currencyCode: z.string().trim().regex(CURRENCY_CODE_PATTERN, INVALID_CURRENCY_MESSAGE),
  ownerFirstName: z.string().trim().optional(),
  ownerLastName: z.string().trim().optional(),
})

export type CreateStoreFormValues = z.infer<typeof createStoreSchema>

// D7(b): the platform console can edit a tenant's name and currency, never its
// subdomain — reusing the field validators above keeps both forms behind the
// exact same rules instead of redefining them.
export const updateTenantSettingsSchema = createStoreSchema.pick({
  storeName: true,
  currencyCode: true,
})

export type UpdateTenantSettingsValues = z.infer<typeof updateTenantSettingsSchema>

// D4's fields that already have a column but never had an editor: legal name
// (stores.legal_name) and the two store_contact fields settable directly
// (reply_to/order_mailbox go through requestMailboxVerificationSchema below
// instead, since setting them always starts a verification, never a plain
// write).
export const updateStoreIdentitySchema = z.object({
  legalName: z.string().trim().min(1, "La razón social es requerida"),
  phone: z.string().trim().min(1, "El teléfono es requerido"),
  commercialAddress: z.string().trim().min(1, "La dirección es requerida"),
})

const MAILBOX_FIELDS = ["reply_to", "order_mailbox"] as const

export const requestMailboxVerificationSchema = z.object({
  field: z.enum(MAILBOX_FIELDS),
  email: z.string().trim().min(1, INVALID_EMAIL_MESSAGE).email(INVALID_EMAIL_MESSAGE),
})

export type MailboxVerificationField = (typeof MAILBOX_FIELDS)[number]
