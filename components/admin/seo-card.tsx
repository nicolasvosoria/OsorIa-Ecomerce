"use client"

import { type ReactNode } from "react"
import type { FieldValues, Path, UseFormRegister } from "react-hook-form"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

type SeoFieldValues = { seo_title: string; seo_description: string }

// Los campos extra que un formulario quiera meter en esta tarjeta van por children:
// solo productos tiene etiquetas, y la tarjeta no debería conocerlas.
export function SeoCard<TFieldValues extends FieldValues & SeoFieldValues>({
  register,
  description,
  children,
}: {
  register: UseFormRegister<TFieldValues>
  description?: string
  children?: ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField id="seo_title" label="Título SEO">
          {(fieldProps) => (
            <Input
              {...fieldProps}
              placeholder="Título para motores de búsqueda"
              {...register("seo_title" as Path<TFieldValues>)}
            />
          )}
        </FormField>

        <FormField id="seo_description" label="Descripción SEO">
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              placeholder="Descripción para motores de búsqueda"
              rows={3}
              {...register("seo_description" as Path<TFieldValues>)}
            />
          )}
        </FormField>

        {children}
      </CardContent>
    </Card>
  )
}
