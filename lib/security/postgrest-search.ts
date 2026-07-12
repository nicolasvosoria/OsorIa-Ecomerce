const POSTGREST_OR_METACHARACTERS = /[,()%'"]/g;
const MAX_SEARCH_TERM_LENGTH = 100;

export function sanitizeIlikeSearchTerm(value: unknown): string {
  if (!value || typeof value !== "string") {
    return "";
  }

  return value
    .replace(POSTGREST_OR_METACHARACTERS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SEARCH_TERM_LENGTH);
}
