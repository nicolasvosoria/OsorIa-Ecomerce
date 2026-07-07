"use client"

import { useCallback, useEffect, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getThemeVersions } from "@/lib/supabase/themes-api"
import type { ThemeVersionSummary } from "@/lib/types/theme"
import { deferStateUpdate } from "@/lib/react/defer-state-update"
import { InfoTooltip } from "@/components/theme/info-tooltip"

type RevertResult = { success: boolean; error?: string }

interface HistorialTabProps {
  refreshToken: number
  onRevert: (versionId: string) => Promise<RevertResult>
}

const HISTORY_TOOLTIP =
  "Restaurar aplica esa versión para todas las visitas de inmediato."

export function HistorialTab({ refreshToken, onRevert }: HistorialTabProps) {
  const [versions, setVersions] = useState<ThemeVersionSummary[]>([])
  const [loadingVersions, setLoadingVersions] = useState(true)
  const [revertingId, setRevertingId] = useState<string | null>(null)
  const [revertResult, setRevertResult] = useState<{ ok: boolean; message: string } | null>(null)

  const loadVersions = useCallback(async () => {
    setLoadingVersions(true)
    setVersions(await getThemeVersions())
    setLoadingVersions(false)
  }, [])

  useEffect(() => {
    // `refreshToken` bumps after a successful "Aplicar" elsewhere in the
    // editor, so this tab's list stays current even while it stays mounted.
    deferStateUpdate(() => {
      void loadVersions()
    })
  }, [loadVersions, refreshToken])

  const handleRevert = useCallback(
    async (versionId: string) => {
      setRevertingId(versionId)
      setRevertResult(null)
      const result = await onRevert(versionId)
      setRevertResult(
        result.success
          ? { ok: true, message: "Versión restaurada para todas las visitas." }
          : { ok: false, message: result.error ?? "No se pudo restaurar la versión." },
      )
      setRevertingId(null)
      await loadVersions()
    },
    [onRevert, loadVersions],
  )

  if (loadingVersions) {
    return (
      <div className="flex items-center gap-2 pt-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Cargando historial…
      </div>
    )
  }

  if (versions.length === 0) {
    return (
      <p className="pt-3 text-sm text-muted-foreground">
        Todavía no hay versiones publicadas.
      </p>
    )
  }

  return (
    <div className="space-y-2 pt-3">
      <div className="flex items-center gap-1">
        <p className="text-xs font-medium">Versiones publicadas</p>
        <InfoTooltip label="Sobre restaurar versiones" content={HISTORY_TOOLTIP} />
      </div>
      {revertResult && (
        <p
          role="status"
          className={`text-xs ${revertResult.ok ? "text-[var(--success)]" : "text-destructive"}`}
        >
          {revertResult.message}
        </p>
      )}
      {versions.map((version) => (
        <VersionRow
          key={version.id}
          version={version}
          reverting={revertingId === version.id}
          disabled={revertingId !== null}
          onRevert={() => handleRevert(version.id)}
        />
      ))}
    </div>
  )
}

interface VersionRowProps {
  version: ThemeVersionSummary
  reverting: boolean
  disabled: boolean
  onRevert: () => void
}

function VersionRow({ version, reverting, disabled, onRevert }: VersionRowProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <Badge variant={version.isCustom ? "default" : "outline"} className="normal-case">
            {version.isCustom ? "Personalizado" : "Preset"}
          </Badge>
          {version.isCurrent && (
            <Badge variant="secondary" className="normal-case">
              Vigente
            </Badge>
          )}
        </div>
        <p className="mt-1 truncate text-sm font-medium">{version.baseThemeName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true, locale: es })}
        </p>
      </div>
      {!version.isCurrent && (
        <Button variant="outline" size="sm" onClick={onRevert} disabled={disabled}>
          {reverting && <Loader2 className="h-4 w-4 animate-spin" />}
          Restaurar
        </Button>
      )}
    </div>
  )
}
