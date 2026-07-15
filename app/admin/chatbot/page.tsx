"use client"

import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2, Save, Bot, MessageSquare, HelpCircle } from "lucide-react"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { DEFAULT_CHATBOT_CONFIG } from "@/lib/supabase/chatbot-api"
import { getAdminRequestHeaders } from "@/lib/supabase/admin-request-headers"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { chatbotConfigSchema, type ChatbotConfigFormValues } from "@/lib/chatbot/schemas"
import { saveChatbotConfigAction } from "./actions"
import { FieldError } from "@/components/admin/field-error"

const defaultFormValues: ChatbotConfigFormValues = {
  assistantGuide: DEFAULT_CHATBOT_CONFIG.assistantGuide,
  tone: DEFAULT_CHATBOT_CONFIG.tone,
  temperature: String(DEFAULT_CHATBOT_CONFIG.temperature),
  maxTokens: String(DEFAULT_CHATBOT_CONFIG.maxTokens),
}

export default function ChatbotConfigPage() {
  const { isAdmin } = useAdminPermissions()
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChatbotConfigFormValues>({
    resolver: zodResolver(chatbotConfigSchema),
    defaultValues: defaultFormValues,
  })

  useEffect(() => {
    const loadConfig = async () => {
      if (!isAdmin) return

      setIsLoading(true)
      try {
        const headers = await getAdminRequestHeaders()
        const response = await fetch("/api/chatbot-config", { headers })
        if (!response.ok) {
          throw new Error("No se pudo cargar la configuración")
        }

        const data = await response.json()
        if (data.config) {
          reset({
            assistantGuide: data.config.assistantGuide,
            tone: data.config.tone,
            temperature: String(data.config.temperature),
            maxTokens: String(data.config.maxTokens),
          })
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
  }, [isAdmin, reset])

  const onSubmit = async (values: ChatbotConfigFormValues) => {
    const result = await saveChatbotConfigAction(values)

    if (result.success) {
      toast.success("Configuración guardada correctamente")
    } else {
      toast.error(result.error || "Error al guardar la configuración")
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link href="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground">Chat / Asistente IA</h1>
            <p className="text-sm text-muted-foreground">
              Configura la guía que usará el asistente para clientes de esta tienda
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-6">
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
                  {...register("assistantGuide")}
                />
                <FieldError message={errors.assistantGuide?.message} />
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
                <Controller
                  control={control}
                  name="tone"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
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
                  )}
                />
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
                          className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                          aria-label="Información sobre temperatura"
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
                    className="w-full px-3 py-2 rounded-md border"
                    style={{
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                      borderColor: "var(--border)",
                    }}
                    {...register("temperature")}
                  />
                  <FieldError message={errors.temperature?.message} />
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
                    className="w-full px-3 py-2 rounded-md border"
                    style={{
                      backgroundColor: "var(--background)",
                      color: "var(--foreground)",
                      borderColor: "var(--border)",
                    }}
                    {...register("maxTokens")}
                  />
                  <FieldError message={errors.maxTokens?.message} />
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
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground)",
              }}
            >
              {isSubmitting ? (
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
        </form>
      )}
    </div>
  )
}
