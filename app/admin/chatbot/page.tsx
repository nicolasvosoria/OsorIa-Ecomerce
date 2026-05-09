"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Loader2, 
  ShieldAlert, 
  ArrowLeft,
  Save,
  Bot,
  MessageSquare,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { DEFAULT_CHATBOT_CONFIG, type ChatbotConfig } from "@/lib/supabase/chatbot-api"
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function ChatbotConfigPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState<ChatbotConfig>(DEFAULT_CHATBOT_CONFIG)

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/")
    }
  }, [isAdmin, loading, router])

  useEffect(() => {
    const loadConfig = async () => {
      if (!isAdmin) return

      setIsLoading(true)
      try {
        const headers = await getAdminRequestHeaders()
        const response = await fetch("/api/chatbot-config", { headers })
        if (response.ok) {
          const data = await response.json()
          if (data.config) {
            setConfig(data.config)
          }
        }
      } catch (error) {
        console.error("[Chatbot Config] Error al cargar configuración:", error)
        toast.error("Error al cargar la configuración")
      } finally {
        setIsLoading(false)
      }
    }

    if (isAdmin) {
      loadConfig()
    }
  }, [isAdmin])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch("/api/chatbot-config", {
        method: "POST",
        headers: await getAdminRequestHeaders(),
        body: JSON.stringify({ config }),
      })

      if (response.ok) {
        toast.success("Configuración guardada correctamente")
      } else {
        const data = await response.json()
        toast.error(data.error || "Error al guardar la configuración")
      }
    } catch (error) {
      console.error("[Chatbot Config] Error al guardar:", error)
      toast.error("Error al guardar la configuración")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Loader2 
          className="h-8 w-8 animate-spin" 
          style={{ color: "var(--foreground)" }}
        />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div 
        className="flex items-center justify-center h-screen p-4"
        style={{ backgroundColor: "var(--background)" }}
      >
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              <CardTitle>Acceso Denegado</CardTitle>
            </div>
            <CardDescription>
              No tienes permisos para acceder a esta página.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/">Volver al Inicio</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen" 
      style={{ 
        backgroundColor: "var(--background)",
        background: "linear-gradient(to bottom right, var(--background), var(--muted))"
      }}
    >
      {/* Header */}
      <header 
        className="border-b shadow-sm"
        style={{ 
          backgroundColor: "var(--card)",
          borderColor: "var(--border)"
        }}
      >
        <div className="container mx-auto px-4 py-4 max-w-full">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9 sm:h-10 sm:w-10" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 
                  className="text-lg sm:text-xl md:text-2xl font-bold truncate"
                  style={{ color: "var(--foreground)" }}
                >
                  Chat / Asistente IA
                </h1>
                <p 
                  className="text-xs sm:text-sm mt-1 truncate"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Configura la guía que usará el asistente para clientes de esta tienda
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl w-full overflow-x-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Guía del asistente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Guía del asistente para clientes
                </CardTitle>
                <CardDescription>
                  Escribe la guía general que seguirá el asistente en las conversaciones
                  de clientes de esta tienda. Puede tener varios párrafos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assistantGuide">Guía del asistente para clientes</Label>
                  <Textarea
                    id="assistantGuide"
                    value={config.assistantGuide}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        assistantGuide: e.target.value,
                        systemPrompt: e.target.value,
                      })
                    }
                    placeholder={
                      "Describe el tono del asistente (ej. cercano, profesional o breve).\n\n" +
                      "Indica qué información sí puede usar: productos reales del catálogo, detalles visibles, promociones configuradas y pasos de compra confirmados.\n\n" +
                      "Indica qué no debe decir: precios, stock, tiempos de envío, políticas, garantías o descuentos que no estén disponibles en los datos reales de la tienda."
                    }
                    className="min-h-[200px] font-mono text-sm"
                    style={{
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                      borderColor: "var(--border)",
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si dejas la guía vacía, el chat usará una guía genérica segura
                    para ecommerce que no inventa precios, stock, envíos ni políticas.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tono de Conversación */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Tono de Conversación
                </CardTitle>
                <CardDescription>
                  Selecciona el tono que utilizará el asistente virtual en sus respuestas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tone">Tono</Label>
                  <Select
                    value={config.tone}
                    onValueChange={(value: ChatbotConfig["tone"]) => 
                      setConfig({ ...config, tone: value })
                    }
                  >
                    <SelectTrigger 
                      id="tone"
                      style={{
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">
                        Profesional - Formal y respetuoso
                      </SelectItem>
                      <SelectItem value="friendly">
                        Amigable - Cálido y cercano
                      </SelectItem>
                      <SelectItem value="casual">
                        Casual - Relajado y conversacional
                      </SelectItem>
                      <SelectItem value="formal">
                        Formal - Estricto y protocolario
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Configuración Avanzada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="temperature">Temperatura (Creatividad)</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2"
                            aria-label="Información sobre temperatura"
                            style={{ 
                              focusRingColor: "var(--accent)",
                            }}
                          >
                            <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent 
                          side="right" 
                          className="max-w-xs"
                        >
                          <p className="font-semibold mb-2">¿Qué es la Temperatura?</p>
                          <p className="text-xs leading-relaxed mb-2">
                            La temperatura controla la aleatoriedad y creatividad de las respuestas del asistente virtual.
                          </p>
                          <div className="text-xs space-y-1 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                            <p><strong>0.0 - 0.3:</strong> Respuestas muy deterministas y predecibles. Ideal para información precisa.</p>
                            <p><strong>0.4 - 0.7:</strong> Balance entre precisión y creatividad. Recomendado para la mayoría de casos.</p>
                            <p><strong>0.8 - 1.2:</strong> Respuestas más creativas y variadas. Útil para conversaciones más naturales.</p>
                            <p><strong>1.3 - 2.0:</strong> Máxima creatividad. Puede generar respuestas muy originales pero menos predecibles.</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <input
                      id="temperature"
                      type="number"
                      min="0"
                      max="2"
                      step="0.1"
                      value={config.temperature || 0.7}
                      onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 rounded-md border"
                      style={{
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Valores más altos = más creativo (0.0 - 2.0)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Máximo de Tokens</Label>
                    <input
                      id="maxTokens"
                      type="number"
                      min="100"
                      max="2000"
                      step="100"
                      value={config.maxTokens || 500}
                      onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 rounded-md border"
                      style={{
                        backgroundColor: "var(--background)",
                        color: "var(--foreground)",
                        borderColor: "var(--border)",
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Longitud máxima de las respuestas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botones de Acción */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard">Cancelar</Link>
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground)",
                }}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar guía
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
