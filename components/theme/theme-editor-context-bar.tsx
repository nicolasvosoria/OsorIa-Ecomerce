import { ChevronLeft, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"

const GENERAL_HINT = "Haz clic en una sección del preview para editarla."

type ThemeEditorContextBarProps =
  | { mode: "general" }
  | { mode: "section"; sectionLabel: string; onBackToGeneral: () => void }

export function ThemeEditorContextBar(props: ThemeEditorContextBarProps) {
  if (props.mode === "section") {
    return (
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-background px-4 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="-ml-1 shrink-0"
          onClick={props.onBackToGeneral}
          aria-label="Volver al diseño general"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="truncate text-sm font-medium">Editando: {props.sectionLabel}</span>
      </div>
    )
  }

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-0.5 border-b bg-background px-4 py-2">
      <span className="flex items-center gap-2 text-sm font-medium">
        <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        Diseño general
      </span>
      <span className="text-xs text-muted-foreground">{GENERAL_HINT}</span>
    </div>
  )
}
