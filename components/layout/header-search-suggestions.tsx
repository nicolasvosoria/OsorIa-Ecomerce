import { Search } from "lucide-react"
import type { Translations } from "@/lib/i18n/translations"

interface HeaderSearchSuggestionsProps {
  isSearching: boolean
  suggestions: Array<{ id: string; title: string; slug: string; image?: string }>
  searchQuery: string
  onSelectSuggestion: (slug: string) => void
  onViewAllResults: () => void
  t: Translations
}

// Dropdown de resultados bajo el input de búsqueda, compartido por el formulario de escritorio y el móvil.
export function HeaderSearchSuggestions({
  isSearching,
  suggestions,
  searchQuery,
  onSelectSuggestion,
  onViewAllResults,
  t,
}: HeaderSearchSuggestionsProps) {
  return (
    <div
      className="absolute top-full left-0 right-0 mt-2 bg-background border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--background)",
      }}
    >
      {isSearching ? (
        <div className="p-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          Buscando...
        </div>
      ) : suggestions.length > 0 ? (
        <>
          <div className="p-2 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs font-medium px-2" style={{ color: "var(--muted-foreground)" }}>
              Productos sugeridos
            </p>
          </div>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => onSelectSuggestion(suggestion.slug)}
              className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
              style={{
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--muted)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              {suggestion.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- Search suggestion thumbnails come from arbitrary storefront URLs; matches the header's existing native-img usage.
                <img
                  src={suggestion.image}
                  alt={suggestion.title}
                  className="w-12 h-12 object-cover rounded"
                  onError={(e) => {
                    e.currentTarget.src = "/placeholder.svg"
                  }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded flex items-center justify-center"
                  style={{ backgroundColor: "var(--muted)" }}
                >
                  <Search className="h-5 w-5" style={{ color: "var(--muted-foreground)" }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                  {suggestion.title}
                </p>
              </div>
            </button>
          ))}
          <div className="p-2 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              type="button"
              onClick={onViewAllResults}
              className="w-full text-sm font-medium text-center py-2 hover:underline"
              style={{ color: "var(--primary)" }}
            >
              {t.header.viewAllResults.replace('{query}', searchQuery)}
            </button>
          </div>
        </>
      ) : (
        <div className="p-4 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
          {t.header.noProductsFound}
        </div>
      )}
    </div>
  )
}
