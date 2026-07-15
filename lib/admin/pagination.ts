// Tamaño de página por defecto para listados admin paginados (ej. productos, pedidos).
export const DEFAULT_PAGE_SIZE = 20

export function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}
