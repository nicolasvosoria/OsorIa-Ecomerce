import type { Language } from "@/lib/i18n/translations";

const LANGUAGE_LOCALES: Record<Language, string> = {
  es: "es-CO",
  en: "en-US",
  pt: "pt-BR",
};

export function formatOrderDate(orderDate: string, language: Language): string {
  return new Intl.DateTimeFormat(LANGUAGE_LOCALES[language], {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(orderDate));
}
