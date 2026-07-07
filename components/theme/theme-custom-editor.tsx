"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { RefObject } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/contexts/theme-context"
import { useMode } from "@/contexts/mode-context"
import { useFont } from "@/contexts/font-context"
import { useStyles } from "@/contexts/styles-context"
import type { AppTheme, ThemeColors, ThemeDefinition, ThemeMode } from "@/lib/types/theme"
import type { AppFontPairing } from "@/lib/types/font"
import { resolveThemeDefinition } from "@/lib/theme-font/theme-presets"
import type { RuntimeTheme } from "@/lib/theme-font/runtime-contract"
import {
  THEME_PREVIEW_MESSAGE_SOURCE,
  THEME_PREVIEW_FONT_SOURCE,
  THEME_PREVIEW_SELECTION_SOURCE,
  THEME_PREVIEW_CONTENT_SOURCE,
  parseThemePreviewSelectMessage,
} from "@/lib/theme-font/preview-mode"
import { deferStateUpdate } from "@/lib/react/defer-state-update"
import { updateComponentStyle } from "@/lib/supabase/styles-api"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ColoresTab, COLOR_SET_LABELS } from "@/components/theme/theme-editor-colors-tab"
import { FormaTab } from "@/components/theme/theme-editor-shape-tab"
import { SECTION_NAME_LABELS } from "@/components/theme/theme-editor-sections-tab"
import { SectionDesignPanel } from "@/components/theme/theme-editor-section-design-panel"
import { SectionContentPanel } from "@/components/theme/theme-editor-section-content-panel"
import { FuentesTab } from "@/components/theme/theme-editor-fonts-tab"
import { HistorialTab } from "@/components/theme/theme-editor-history-tab"
import { ThemeEditorContextBar } from "@/components/theme/theme-editor-context-bar"
import { ArrowLeft, History, Loader2, Monitor, RotateCcw, Smartphone, Tablet } from "lucide-react"

const PREVIEW_HOME_PATH = "/?themePreview=1"
const TABLET_STAGE_WIDTH = "768px"
const MOBILE_STAGE_WIDTH = "390px"

type PreviewWidth = "desktop" | "tablet" | "mobile"

const SIDEBAR_TABS = [
  { value: "colores", label: "Colores" },
  { value: "forma", label: "Forma" },
  { value: "fuentes", label: "Fuentes" },
] as const

type DefinitionUpdater = (prev: ThemeDefinition) => ThemeDefinition

function resolveBaseDefinition(theme: AppTheme): ThemeDefinition {
  return theme.definition ?? resolveThemeDefinition(theme.theme_name, theme.colors)
}

// `AppFontPairing.id` is numeric; `ThemeDefinition.fontPairingId` stores it as
// a string (the shape the runtime contract and activation route round-trip).
function pairingIdFromDefinition(fontPairingId: string | null | undefined): number | null {
  if (fontPairingId == null || fontPairingId === "") return null
  const parsed = Number(fontPairingId)
  return Number.isFinite(parsed) ? parsed : null
}

function pairingIdToDefinition(pairingId: number | null): string | null {
  return pairingId != null ? String(pairingId) : null
}

function buildPreviewRuntimeTheme(definition: ThemeDefinition): RuntimeTheme {
  return {
    theme_name: "Personalizado",
    colors: definition.colorsLight,
    theme_fingerprint: "preview:custom",
    colorsLight: definition.colorsLight,
    colorsDark: definition.colorsDark,
    radius: definition.radius,
    density: definition.density,
    shadow: definition.shadow,
    shape: definition.shape,
    fontPairingId: definition.fontPairingId ?? null,
    sections: definition.sections,
  }
}

export function ThemeCustomEditor() {
  const { themes, activeTheme, loading, changeThemeCustom, revertToVersion } = useTheme()
  const { isDark } = useMode()
  const { pairings, changePairing } = useFont()
  const { styles: globalStyles } = useStyles()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const [selectedBaseName, setSelectedBaseName] = useState<string | null>(null)
  const [workingDefinition, setWorkingDefinition] = useState<ThemeDefinition | null>(null)
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop")
  const [editingColorSet, setEditingColorSet] = useState<ThemeMode>(isDark ? "dark" : "light")
  const [selectedPairingId, setSelectedPairingId] = useState<number | null>(null)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [historyRefreshToken, setHistoryRefreshToken] = useState(0)
  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  // True once the admin makes any unpublished edit, so exiting or discarding can
  // warn before losing changes. Reset on apply-success and discard.
  const [dirty, setDirty] = useState(false)
  // Ephemeral per-section content staging: a preview-only channel until
  // handleApply below persists it (merged over current DB variables) as part
  // of the unified publish.
  const [workingContent, setWorkingContent] = useState<Record<string, Record<string, any>>>({})

  // Seed the working definition once the base list resolves: defaults to the
  // store's currently active theme, falling back to the first preset.
  useEffect(() => {
    if (selectedBaseName || loading || themes.length === 0) return

    const defaultBase = activeTheme ?? themes[0]
    const baseDefinition = resolveBaseDefinition(defaultBase)
    deferStateUpdate(() => {
      setSelectedBaseName(defaultBase.theme_name)
      setWorkingDefinition(baseDefinition)
      setSelectedPairingId(pairingIdFromDefinition(baseDefinition.fontPairingId))
    })
  }, [activeTheme, loading, themes, selectedBaseName])

  const handleSelectBase = useCallback(
    (themeName: string) => {
      const nextBase = themes.find((theme) => theme.theme_name === themeName)
      if (!nextBase) return
      setSelectedBaseName(nextBase.theme_name)
      // Keep the chosen font pairing (a parallel axis) across a base switch.
      setWorkingDefinition({
        ...resolveBaseDefinition(nextBase),
        fontPairingId: pairingIdToDefinition(selectedPairingId),
      })
      setDirty(true)
    },
    [themes, selectedPairingId],
  )

  const handleDiscard = useCallback(() => {
    // Discard undoes EVERYTHING unpublished — including a base switch made
    // while exploring — so it must revert to the real active base (persisted
    // in DB), not merely to whichever base the selector currently shows.
    const activeBase = activeTheme ?? themes[0]
    if (!activeBase) return
    const baseDefinition = resolveBaseDefinition(activeBase)
    setSelectedBaseName(activeBase.theme_name)
    setWorkingDefinition(baseDefinition)
    setSelectedPairingId(pairingIdFromDefinition(baseDefinition.fontPairingId))
    setWorkingContent({})
    setDirty(false)
    // A reload clears any applied preview pairing and any staged content the
    // iframe had received; onLoad re-posts the theme (content starts empty,
    // so the preview falls back to the real saved content — no ghost edits).
    iframeRef.current?.contentWindow?.location.reload()
  }, [activeTheme, themes])

  const updateDefinition = useCallback((updater: DefinitionUpdater) => {
    setWorkingDefinition((prev) => (prev ? updater(prev) : prev))
    setDirty(true)
  }, [])

  const handleColorChange = useCallback(
    (key: keyof ThemeColors, value: string) => {
      const colorSetKey = editingColorSet === "dark" ? "colorsDark" : "colorsLight"
      updateDefinition((prev) => ({
        ...prev,
        [colorSetKey]: { ...prev[colorSetKey], [key]: value },
      }))
    },
    [editingColorSet, updateDefinition],
  )

  const previewTheme = useMemo(
    () => (workingDefinition ? buildPreviewRuntimeTheme(workingDefinition) : null),
    [workingDefinition],
  )

  const postToPreview = useCallback((message: unknown) => {
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin)
  }, [])

  const postPreviewMessage = useCallback(() => {
    if (!previewTheme) return
    postToPreview({
      source: THEME_PREVIEW_MESSAGE_SOURCE,
      theme: previewTheme,
      mode: editingColorSet,
    })
  }, [previewTheme, editingColorSet, postToPreview])

  // Re-post on every working-definition/mode change; `onLoad` below covers
  // the initial load (or a reload triggered by the iframe's own navigation).
  useEffect(() => {
    postPreviewMessage()
  }, [postPreviewMessage])

  const selectedPairing = useMemo(
    () => pairings.find((pairing) => pairing.id === selectedPairingId) ?? null,
    [pairings, selectedPairingId],
  )

  const postFontPreviewMessage = useCallback(() => {
    if (!selectedPairing) return
    postToPreview({ source: THEME_PREVIEW_FONT_SOURCE, pairing: selectedPairing })
  }, [selectedPairing, postToPreview])

  const handleSelectPairing = useCallback(
    (pairing: AppFontPairing | null) => {
      setSelectedPairingId(pairing?.id ?? null)
      updateDefinition((prev) => ({
        ...prev,
        fontPairingId: pairingIdToDefinition(pairing?.id ?? null),
      }))
      if (pairing) {
        postToPreview({ source: THEME_PREVIEW_FONT_SOURCE, pairing })
      } else {
        // No pairing = system default: reload to drop the applied preview font.
        iframeRef.current?.contentWindow?.location.reload()
      }
    },
    [updateDefinition, postToPreview],
  )

  // Pushes every staged component's content edits over the CONTENT channel
  // (lib/theme-font/preview-mode.ts's `THEME_PREVIEW_CONTENT_SOURCE`); the
  // in-iframe admin-context bridge applies them onto `componentEdits`, which
  // the storefront sections already overlay, so the preview updates
  // live with zero changes to section render code.
  const postContentPreviewMessages = useCallback(() => {
    Object.entries(workingContent).forEach(([componentName, edits]) => {
      postToPreview({ source: THEME_PREVIEW_CONTENT_SOURCE, componentName, edits })
    })
  }, [workingContent, postToPreview])

  // Re-post on every working-content change (mirrors postPreviewMessage
  // above); `handleIframeLoad` covers the initial load/reload.
  useEffect(() => {
    postContentPreviewMessages()
  }, [postContentPreviewMessages])

  // The content callback seam's `onFieldChange`: stages the edit for
  // `componentName` in `workingContent` (purely ephemeral — no
  // `updateComponentStyle`/API call happens here).
  const handleContentFieldChange = useCallback((componentName: string, key: string, value: any) => {
    setWorkingContent((prev) => ({
      ...prev,
      [componentName]: { ...prev[componentName], [key]: value },
    }))
  }, [])

  const handleIframeLoad = useCallback(() => {
    postPreviewMessage()
    postFontPreviewMessage()
    postContentPreviewMessages()
  }, [postPreviewMessage, postFontPreviewMessage, postContentPreviewMessages])

  const postSectionSelection = useCallback((componentName: string | null) => {
    postToPreview({ source: THEME_PREVIEW_SELECTION_SOURCE, componentName })
  }, [postToPreview])

  const handleBackToGeneral = useCallback(() => {
    setSelectedSection(null)
    postSectionSelection(null)
  }, [postSectionSelection])

  // Callback seam consumed by SectionContentPanel: pre-bound to the currently
  // selected section, so each field update writes to the right section
  // without passing its id through every call site.
  const handleSectionContentChange = useCallback(
    (key: string, value: any) => {
      if (!selectedSection) return
      handleContentFieldChange(selectedSection, key, value)
      setDirty(true)
    },
    [selectedSection, handleContentFieldChange],
  )

  // Selection crosses the iframe boundary both ways: the child reports a
  // click via `THEME_PREVIEW_SELECT_SOURCE`, and the parent echoes it back
  // via `THEME_PREVIEW_SELECTION_SOURCE` so the highlight follows the current
  // selection (same-origin check mirrors `theme-context.tsx`'s listener).
  useEffect(() => {
    const handleSelectMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      const message = parseThemePreviewSelectMessage(event.data)
      if (!message) return

      setSelectedSection(message.componentName)
      postSectionSelection(message.componentName)
    }

    window.addEventListener("message", handleSelectMessage)
    return () => window.removeEventListener("message", handleSelectMessage)
  }, [postSectionSelection])

  // Unified transactional publish — content writes FIRST (idempotent
  // upserts, so a retry re-writes cleanly), theme version LAST (the atomic
  // "flip"). If any content write fails, the theme is never published; if the
  // theme publish fails, the already-written content stays (acceptable, since
  // the upserts are idempotent) and the error makes clear design wasn't
  // published.
  const handleApply = useCallback(async () => {
    if (!workingDefinition || !selectedBaseName || applying) return
    setApplying(true)
    setApplyResult(null)
    try {
      for (const [componentName, edits] of Object.entries(workingContent)) {
        // Merge over the CURRENT persisted variables so untouched keys for
        // that component survive.
        const mergedContent = { ...(globalStyles.get(componentName) ?? {}), ...edits }
        try {
          await updateComponentStyle(componentName, mergedContent)
        } catch (err) {
          const sectionLabel = SECTION_NAME_LABELS[componentName] ?? componentName
          const reason = err instanceof Error ? err.message : "Error desconocido"
          setApplyResult({
            ok: false,
            message: `Falló el contenido de "${sectionLabel}" (${reason}). El diseño no se publicó — puedes reintentar.`,
          })
          return
        }
      }

      const result = await changeThemeCustom(selectedBaseName, workingDefinition)
      // Fonts are a parallel axis — activate the chosen pairing through its
      // own system so the published theme also carries the typography.
      if (result.success && selectedPairing) {
        await changePairing(selectedPairing.pairing_name)
      }

      if (result.success) {
        setHistoryRefreshToken((token) => token + 1)
        setWorkingContent({})
        setDirty(false)
        // Content is already persisted (written above) and changeThemeCustom's
        // finalizeThemeActivation already refreshed the styles baseline; a
        // reload drops the iframe's ephemeral componentEdits overlay so the
        // preview shows exactly the saved state, not a stale staged overlay
        // (mirrors handleDiscard's reload).
        iframeRef.current?.contentWindow?.location.reload()
      }

      setApplyResult(
        result.success
          ? { ok: true, message: "Tema publicado para todas las visitas." }
          : {
              ok: false,
              message:
                result.error ??
                "El contenido se guardó, pero no se pudo publicar el diseño — puedes reintentar.",
            },
      )
    } finally {
      setApplying(false)
    }
  }, [
    workingDefinition,
    selectedBaseName,
    applying,
    workingContent,
    globalStyles,
    changeThemeCustom,
    selectedPairing,
    changePairing,
  ])

  // Clear the publish result once the user edits again, so a stale "publicado"
  // never lingers over unsaved changes.
  useEffect(() => {
    deferStateUpdate(() => setApplyResult(null))
  }, [workingDefinition, selectedPairingId])

  return (
    <div className="editor-chrome flex h-screen min-w-[720px] flex-col overflow-hidden bg-muted/20">
      <TopBar
        themes={themes}
        loading={loading}
        selectedBaseName={selectedBaseName}
        onSelectBase={handleSelectBase}
        onDiscard={handleDiscard}
        onApply={handleApply}
        applying={applying}
        applyResult={applyResult}
        canApply={workingDefinition !== null}
        hasUnsavedChanges={dirty}
        historyRefreshToken={historyRefreshToken}
        onRevertVersion={revertToVersion}
      />
      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <Sidebar
          definition={workingDefinition}
          editingColorSet={editingColorSet}
          onEditingColorSetChange={setEditingColorSet}
          onUpdateDefinition={updateDefinition}
          onColorChange={handleColorChange}
          pairings={pairings}
          selectedPairingId={selectedPairingId}
          onSelectPairing={handleSelectPairing}
          selectedSection={selectedSection}
          onBackToGeneral={handleBackToGeneral}
          persistedContent={selectedSection ? globalStyles.get(selectedSection) ?? {} : {}}
          stagedContent={selectedSection ? workingContent[selectedSection] ?? {} : {}}
          onContentFieldChange={handleSectionContentChange}
        />
        <Stage
          iframeRef={iframeRef}
          previewWidth={previewWidth}
          onTogglePreviewWidth={setPreviewWidth}
          onIframeLoad={handleIframeLoad}
          editingColorSet={editingColorSet}
        />
      </div>
    </div>
  )
}

interface TopBarProps {
  themes: AppTheme[]
  loading: boolean
  selectedBaseName: string | null
  onSelectBase: (themeName: string) => void
  onDiscard: () => void
  onApply: () => void
  applying: boolean
  applyResult: { ok: boolean; message: string } | null
  canApply: boolean
  hasUnsavedChanges: boolean
  historyRefreshToken: number
  onRevertVersion: (versionId: string) => Promise<{ success: boolean; error?: string }>
}

function TopBar({
  themes,
  loading,
  selectedBaseName,
  onSelectBase,
  onDiscard,
  onApply,
  applying,
  applyResult,
  canApply,
  hasUnsavedChanges,
  historyRefreshToken,
  onRevertVersion,
}: TopBarProps) {
  const router = useRouter()
  const handleExit = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm(
        "Tienes cambios sin aplicar. Si sales ahora se perderán. ¿Salir de todos modos?",
      )
    ) {
      return
    }
    router.push("/")
  }
  return (
    <header className="flex flex-wrap items-center gap-3 border-b bg-background px-4 py-3 shadow-sm sm:px-6">
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={handleExit}
        title="Salir del editor y volver al sitio"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Salir
      </Button>
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-base font-semibold sm:text-lg">Editor del sitio web</h1>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="theme-base-select" className="hidden text-sm text-muted-foreground sm:inline">
          Base
        </label>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando temas…
          </div>
        ) : (
          <Select value={selectedBaseName ?? ""} onValueChange={onSelectBase}>
            <SelectTrigger id="theme-base-select" size="sm" className="w-[180px]">
              <SelectValue placeholder="Selecciona una base" />
            </SelectTrigger>
            <SelectContent className="editor-chrome">
              {themes.map((theme) => (
                <SelectItem key={theme.id} value={theme.theme_name}>
                  <span className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: theme.colors.primary }}
                      aria-hidden="true"
                    />
                    {theme.theme_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3">
        {applyResult && (
          <span
            role="status"
            className={`text-xs ${applyResult.ok ? "text-[var(--success)]" : "text-destructive"}`}
          >
            {applyResult.message}
          </span>
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm">
              <History className="h-4 w-4" />
              Historial
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="editor-chrome max-h-[70vh] w-80 overflow-y-auto"
            align="end"
          >
            <HistorialTab refreshToken={historyRefreshToken} onRevert={onRevertVersion} />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="sm"
          onClick={onDiscard}
          disabled={!canApply || applying}
        >
          <RotateCcw className="h-4 w-4" />
          Descartar
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          disabled={!canApply || applying}
          title="Publica este tema para todas las visitas"
        >
          {applying && <Loader2 className="h-4 w-4 animate-spin" />}
          Aplicar
        </Button>
      </div>
    </header>
  )
}

interface SidebarProps {
  definition: ThemeDefinition | null
  editingColorSet: ThemeMode
  onEditingColorSetChange: (mode: ThemeMode) => void
  onUpdateDefinition: (updater: DefinitionUpdater) => void
  onColorChange: (key: keyof ThemeColors, value: string) => void
  pairings: AppFontPairing[]
  selectedPairingId: number | null
  onSelectPairing: (pairing: AppFontPairing | null) => void
  selectedSection: string | null
  onBackToGeneral: () => void
  persistedContent: Record<string, any>
  stagedContent: Record<string, any>
  onContentFieldChange: (key: string, value: any) => void
}

function Sidebar({
  definition,
  editingColorSet,
  onEditingColorSetChange,
  onUpdateDefinition,
  onColorChange,
  pairings,
  selectedPairingId,
  onSelectPairing,
  selectedSection,
  onBackToGeneral,
  persistedContent,
  stagedContent,
  onContentFieldChange,
}: SidebarProps) {
  const activeColors = definition
    ? editingColorSet === "dark"
      ? definition.colorsDark
      : definition.colorsLight
    : null

  if (selectedSection && activeColors) {
    return (
      <SectionPanel
        sectionName={selectedSection}
        sectionLabel={SECTION_NAME_LABELS[selectedSection] ?? selectedSection}
        sections={definition?.sections}
        onUpdateDefinition={onUpdateDefinition}
        onBackToGeneral={onBackToGeneral}
        persistedContent={persistedContent}
        stagedContent={stagedContent}
        onContentFieldChange={onContentFieldChange}
        themeColors={activeColors}
      />
    )
  }

  return (
    <aside className="w-full shrink-0 overflow-y-auto border-b bg-background md:w-[300px] md:border-b-0 md:border-r">
      <ThemeEditorContextBar mode="general" />

      <div className="p-4 pt-3">
        <Tabs defaultValue={SIDEBAR_TABS[0].value}>
          <TabsList className="grid w-full grid-cols-3 gap-1">
            {SIDEBAR_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="colores">
            {definition && activeColors ? (
              <ColoresTab
                colors={activeColors}
                editingColorSet={editingColorSet}
                onEditingColorSetChange={onEditingColorSetChange}
                onColorChange={onColorChange}
              />
            ) : (
              <TabPlaceholder />
            )}
          </TabsContent>

          <TabsContent value="forma">
            {definition ? (
              <FormaTab definition={definition} onUpdateDefinition={onUpdateDefinition} />
            ) : (
              <TabPlaceholder />
            )}
          </TabsContent>

          <TabsContent value="fuentes">
            <FuentesTab
              pairings={pairings}
              selectedPairingId={selectedPairingId}
              onSelectPairing={onSelectPairing}
            />
          </TabsContent>
        </Tabs>
      </div>
    </aside>
  )
}

function TabPlaceholder() {
  return <p className="pt-3 text-sm text-muted-foreground">Selecciona una base para empezar a editar.</p>
}

interface SectionPanelProps {
  sectionName: string
  sectionLabel: string
  sections: ThemeDefinition["sections"]
  onUpdateDefinition: (updater: DefinitionUpdater) => void
  onBackToGeneral: () => void
  persistedContent: Record<string, any>
  stagedContent: Record<string, any>
  onContentFieldChange: (key: string, value: any) => void
  themeColors: ThemeColors
}

function SectionPanel({
  sectionName,
  sectionLabel,
  sections,
  onUpdateDefinition,
  onBackToGeneral,
  persistedContent,
  stagedContent,
  onContentFieldChange,
  themeColors,
}: SectionPanelProps) {
  return (
    <aside className="w-full shrink-0 overflow-y-auto border-b bg-background md:w-[300px] md:border-b-0 md:border-r">
      <ThemeEditorContextBar
        mode="section"
        sectionLabel={sectionLabel}
        onBackToGeneral={onBackToGeneral}
      />

      <div className="p-4 pt-3">
        <SectionDesignPanel
          sectionName={sectionName}
          sections={sections}
          onUpdateDefinition={onUpdateDefinition}
          themeColors={themeColors}
        />

        <div className="mt-6">
          <SectionContentPanel
            key={sectionName}
            sectionName={sectionName}
            persistedContent={persistedContent}
            stagedContent={stagedContent}
            onFieldChange={onContentFieldChange}
          />
        </div>
      </div>
    </aside>
  )
}

interface StageProps {
  iframeRef: RefObject<HTMLIFrameElement | null>
  previewWidth: PreviewWidth
  onTogglePreviewWidth: (width: PreviewWidth) => void
  onIframeLoad: () => void
  editingColorSet: ThemeMode
}

const STAGE_WIDTH_BY_PREVIEW: Record<PreviewWidth, string> = {
  desktop: "100%",
  tablet: TABLET_STAGE_WIDTH,
  mobile: MOBILE_STAGE_WIDTH,
}

function Stage({ iframeRef, previewWidth, onTogglePreviewWidth, onIframeLoad, editingColorSet }: StageProps) {
  return (
    <main className="flex flex-1 flex-col overflow-y-auto p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">Inicio</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Vista: {COLOR_SET_LABELS[editingColorSet]}</span>
          <div className="flex items-center gap-1 rounded-md border bg-background p-1">
            <Button
              variant={previewWidth === "desktop" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => onTogglePreviewWidth("desktop")}
              aria-pressed={previewWidth === "desktop"}
              aria-label="Vista de escritorio"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewWidth === "tablet" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => onTogglePreviewWidth("tablet")}
              aria-pressed={previewWidth === "tablet"}
              aria-label="Vista de tablet"
            >
              <Tablet className="h-4 w-4" />
            </Button>
            <Button
              variant={previewWidth === "mobile" ? "secondary" : "ghost"}
              size="icon-sm"
              onClick={() => onTogglePreviewWidth("mobile")}
              aria-pressed={previewWidth === "mobile"}
              aria-label="Vista móvil"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center">
        <div
          className="flex w-full flex-col overflow-hidden rounded-lg border bg-background shadow-sm"
          style={{ maxWidth: STAGE_WIDTH_BY_PREVIEW[previewWidth] }}
        >
          <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-border" aria-hidden="true" />
            <span className="ml-2 truncate rounded-sm border bg-background px-2 py-0.5 text-xs text-muted-foreground">
              tu-tienda.com
            </span>
          </div>
          <iframe
            ref={iframeRef}
            src={PREVIEW_HOME_PATH}
            title="Vista previa de la tienda"
            className="h-[75vh] min-h-[480px] w-full bg-background"
            onLoad={onIframeLoad}
          />
        </div>
      </div>
    </main>
  )
}
