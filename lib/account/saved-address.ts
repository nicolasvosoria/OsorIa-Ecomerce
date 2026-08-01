import type { SavedAddressDraft } from "./schemas"

// Una dirección ya guardada: lo que escribió la persona más lo que decide la
// base de datos — su identidad y cuál de todas es la predeterminada (D16).
export type SavedAddress = SavedAddressDraft & { id: string; isDefault: boolean }

// El checkout autenticado edita un solo campo de dirección (shipping_address),
// así que la dirección guardada le llega aplanada en una línea.
export function formatSavedAddressLine(address: SavedAddressDraft): string {
  return [address.addressLine1, address.city, address.postalCode, address.country]
    .filter((part): part is string => Boolean(part))
    .join(", ")
}
