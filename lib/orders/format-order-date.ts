import { LANGUAGE_LOCALES } from "@/lib/cart/cart-summary";
import type { Language } from "@/lib/i18n/translations";

export function formatOrderDate(orderDate: string, language: Language): string {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(orderDate));
}
