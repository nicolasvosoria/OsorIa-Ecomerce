"use client"

import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

import { Button } from "@/components/ui/button"

const EXPORT_ERROR_MESSAGE = "No se pudo generar el archivo Excel"

export function ExcelExportButton({
  fileNamePrefix,
  errorLogLabel,
  buildWorkbook,
}: {
  fileNamePrefix: string
  errorLogLabel: string
  buildWorkbook: () => XLSX.WorkBook | Promise<XLSX.WorkBook>
}) {
  const [isExporting, setIsExporting] = useState(false)

  async function handleExport() {
    setIsExporting(true)
    try {
      const workbook = await buildWorkbook()
      const exportDate = new Date().toISOString().split("T")[0]
      XLSX.writeFile(workbook, `${fileNamePrefix}_${exportDate}.xlsx`)
    } catch (error) {
      console.error(`${errorLogLabel} Error al generar Excel:`, error)
      toast.error(EXPORT_ERROR_MESSAGE)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      type="button"
      onClick={handleExport}
      disabled={isExporting}
      size="sm"
      className="shrink-0 gap-2"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Generando…</span>
        </>
      ) : (
        <>
          <Download className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Descargar Excel</span>
        </>
      )}
    </Button>
  )
}
