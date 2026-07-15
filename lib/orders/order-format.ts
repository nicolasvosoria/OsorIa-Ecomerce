export function formatOrderDateTime(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleString("es-ES") : "";
}
