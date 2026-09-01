export function formatOrderDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("es-ES") : "";
}

export function formatAddressLine(parts: Array<string | null | undefined>): string {
  return parts.map((part) => part?.trim()).filter(Boolean).join(", ");
}
