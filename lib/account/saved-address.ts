import type { SavedAddressDraft } from "./schemas"

// Una dirección ya guardada: lo que escribió la persona más lo que decide la
// base de datos — su identidad y cuál de todas es la predeterminada (D16).
export type SavedAddress = SavedAddressDraft & { id: string; isDefault: boolean }

// Usado por la lista de la libreta de direcciones para mostrar una dirección
// completa en una sola línea. El checkout ya no la usa para precargar
// shipping_address (D24): el destino estructurado (departamento/municipio)
// llega por su cuenta desde getCheckoutPrefill, y mezclarlo aquí lo
// duplicaría entre el campo de texto libre y el picker. departmentName va
// junto a city porque el nombre del municipio se repite entre departamentos
// en Divipola (D2/D30) -- sin el departamento, la línea es ambigua.
export function formatSavedAddressLine(address: SavedAddressDraft): string {
  return [address.addressLine1, address.city, address.departmentName, address.postalCode, address.country]
    .filter((part): part is string => Boolean(part))
    .join(", ")
}
