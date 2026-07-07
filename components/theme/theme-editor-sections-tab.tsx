export const SECTION_NAME_LABELS: Record<string, string> = {
  featured: "Destacados",
  specialOffer: "Oferta especial",
  newsletter: "Newsletter",
  hero: "Hero",
  popular: "Populares",
}

export const SECTION_COLOR_KEY_LABELS: Record<string, string> = {
  bg: "Fondo",
  cardBg: "Fondo de tarjeta",
  productBg: "Fondo de producto",
  text: "Texto",
  accent: "Acento",
  button: "Botón",
  price: "Color de precio",
  sectionBg: "Fondo de sección",
  iconBg: "Fondo de ícono",
  icon: "Color de ícono",
  title: "Título",
  subtitle: "Subtítulo",
  cornerRadius: "Radio de esquina",
}

export function humanizeCamelCase(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
