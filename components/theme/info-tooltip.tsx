import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface InfoTooltipProps {
  label: string
  content: string
}

/**
 * `ⓘ` affordance for a non-obvious editor control. The trigger is a real
 * button (focusable, `aria-label`), so the explanation surfaces on both
 * hover and keyboard focus.
 */
export function InfoTooltip({ label, content }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent className="editor-chrome max-w-[220px] text-xs" side="top">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}
