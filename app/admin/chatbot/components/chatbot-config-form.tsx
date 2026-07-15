"use client"

import Link from "next/link"
import {
  Controller,
  useForm,
  type Control,
  type FieldErrors,
  type UseFormRegister,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Bot, HelpCircle, Loader2, MessageSquare, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { chatbotConfigSchema, type ChatbotConfigFormValues } from "@/lib/chatbot/schemas"
import { saveChatbotConfigAction } from "../actions"

const GUIDE_PLACEHOLDER =
  "Describe el tono del asistente (ej. cercano, profesional o breve).\n\n" +
  "Indica qué información sí puede usar: productos reales del catálogo, detalles visibles, promociones configuradas y pasos de compra confirmados.\n\n" +
  "Indica qué no debe decir: precios, stock, tiempos de envío, políticas, garantías o descuentos que no estén disponibles en los datos reales de la tienda."

export function ChatbotConfigForm({
  defaultValues,
}: {
  defaultValues: ChatbotConfigFormValues
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ChatbotConfigFormValues>({
    resolver: zodResolver(chatbotConfigSchema),
    defaultValues,
  })

  const onSubmit = async (values: ChatbotConfigFormValues) => {
    const result = await saveChatbotConfigAction(values)

    if (result.success) {
      toast.success("Configuración guardada correctamente")
    } else {
      toast.error(result.error || "Error al guardar la configuración")
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-6">
      <AssistantGuideCard register={register} errors={errors} />
      <ConversationToneCard register={register} control={control} errors={errors} />

      <div className="flex justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/dashboard">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar guía
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

function AssistantGuideCard({
  register,
  errors,
}: {
  register: UseFormRegister<ChatbotConfigFormValues>
  errors: FieldErrors<ChatbotConfigFormValues>
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Guía del asistente para clientes
        </CardTitle>
        <CardDescription>
          Escribe la guía general que seguirá el asistente en las conversaciones de clientes de
          esta tienda. Puede tener varios párrafos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          id="assistantGuide"
          label="Guía del asistente para clientes"
          hint="Si dejas la guía vacía, el chat usará una guía genérica segura para ecommerce que no inventa precios, stock, envíos ni políticas."
          error={errors.assistantGuide?.message}
        >
          {(field) => (
            <Textarea
              {...field}
              placeholder={GUIDE_PLACEHOLDER}
              className="min-h-[200px] font-mono text-sm"
              {...register("assistantGuide")}
            />
          )}
        </FormField>
      </CardContent>
    </Card>
  )
}

function ConversationToneCard({
  register,
  control,
  errors,
}: {
  register: UseFormRegister<ChatbotConfigFormValues>
  control: Control<ChatbotConfigFormValues>
  errors: FieldErrors<ChatbotConfigFormValues>
}) {
  return (
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
        <FormField id="tone" label="Tono">
          {(field) => (
            <Controller
              control={control}
              name="tone"
              render={({ field: tone }) => (
                <Select value={tone.value} onValueChange={tone.onChange}>
                  <SelectTrigger {...field} className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="editor-chrome">
                    <SelectItem value="professional">Profesional - Formal y respetuoso</SelectItem>
                    <SelectItem value="friendly">Amigable - Cálido y cercano</SelectItem>
                    <SelectItem value="casual">Casual - Relajado y conversacional</SelectItem>
                    <SelectItem value="formal">Formal - Estricto y protocolario</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-4 border-t pt-4 md:grid-cols-2">
          <FormField
            id="temperature"
            label="Temperatura (Creatividad)"
            labelAdornment={<TemperatureHint />}
            hint="Valores más altos = más creativo (0.0 - 2.0)"
            error={errors.temperature?.message}
          >
            {(field) => (
              <Input {...field} type="number" min="0" max="2" step="0.1" {...register("temperature")} />
            )}
          </FormField>

          <FormField
            id="maxTokens"
            label="Máximo de Tokens"
            hint="Longitud máxima de las respuestas"
            error={errors.maxTokens?.message}
          >
            {(field) => (
              <Input
                {...field}
                type="number"
                min="100"
                max="2000"
                step="100"
                {...register("maxTokens")}
              />
            )}
          </FormField>
        </div>
      </CardContent>
    </Card>
  )
}

function TemperatureHint() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label="Información sobre temperatura"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground transition-colors hover:text-foreground" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="editor-chrome max-w-xs">
        <p className="mb-2 font-semibold">¿Qué es la Temperatura?</p>
        <p className="mb-2 text-xs leading-relaxed">
          La temperatura controla la aleatoriedad y creatividad de las respuestas del asistente
          virtual.
        </p>
        <div className="mt-2 space-y-1 border-t pt-2 text-xs">
          <p>
            <strong>0.0 - 0.3:</strong> Respuestas muy deterministas y predecibles. Ideal para
            información precisa.
          </p>
          <p>
            <strong>0.4 - 0.7:</strong> Balance entre precisión y creatividad. Recomendado para la
            mayoría de casos.
          </p>
          <p>
            <strong>0.8 - 1.2:</strong> Respuestas más creativas y variadas. Útil para
            conversaciones más naturales.
          </p>
          <p>
            <strong>1.3 - 2.0:</strong> Máxima creatividad. Puede generar respuestas muy originales
            pero menos predecibles.
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
