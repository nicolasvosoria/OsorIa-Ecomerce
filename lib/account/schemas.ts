import { z } from "zod"

// Espeja el default de ecommerce.user_addresses.country: el formulario lo trae
// escrito y el schema lo repone si la persona lo deja en blanco.
export const DEFAULT_ADDRESS_COUNTRY = "Colombia"

// Los campos opcionales viajan como texto desde el formulario y se guardan como
// null cuando quedan vacíos: ni la libreta ni el perfil almacenan cadenas vacías.
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : null))

export const savedAddressDraftSchema = z.object({
  label: optionalText,
  addressLine1: z.string().trim().min(1, "La dirección es requerida"),
  city: optionalText,
  postalCode: optionalText,
  country: z
    .string()
    .trim()
    .transform((value) => value || DEFAULT_ADDRESS_COUNTRY),
})

export type SavedAddressDraftInput = z.input<typeof savedAddressDraftSchema>
export type SavedAddressDraft = z.output<typeof savedAddressDraftSchema>

// El correo queda fuera: identifica la cuenta y no se edita desde aquí (D18).
// El teléfono vive aquí y no en la dirección porque identifica a la persona (A1).
export const accountProfileSchema = z.object({
  firstName: optionalText,
  lastName: optionalText,
  phone: optionalText,
})

export type AccountProfileInput = z.input<typeof accountProfileSchema>
export type AccountProfile = z.output<typeof accountProfileSchema>
