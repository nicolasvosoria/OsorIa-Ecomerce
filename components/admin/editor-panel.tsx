"use client"

import { useAdmin } from "@/contexts/admin-context"
import { useStyles } from "@/contexts/styles-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { X, Save, RotateCcw, Type, Palette } from "lucide-react"
import { useState, useEffect } from "react"
import { updateComponentStyle } from "@/lib/supabase/styles-api"
import { toast } from "sonner"

const COMPONENT_FIELDS: Record<
  string,
  {
    content: Array<{ key: string; label: string; type: string; isArray?: boolean; arrayFields?: any[] }>
    styles: Array<{ key: string; label: string; type: string }>
    defaults?: Record<string, any>
  }
> = {
  hero: {
    content: [
      { key: "label", label: "Etiqueta", type: "text" },
      { key: "title", label: "Título Principal", type: "text" },
      { key: "subtitle", label: "Subtítulo", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "buttonText", label: "Texto del Botón", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      label: "Electronics",
      title: "BALFE",
      subtitle: "NUEVO MODELO",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua",
      buttonText: "Comprar ahora",
      bgColor: "#4a5568",
      textColor: "#ffffff",
    },
  },
  popular: {
    content: [{ key: "title", label: "Título de la Sección", type: "text" }],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "Lo más vendido",
      bgColor: "#ffffff",
      textColor: "#1e354e",
    },
  },
  products: {
    content: [{ key: "title", label: "Título de la Sección", type: "text" }],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "Productos populares",
      bgColor: "#ffffff",
      textColor: "#1e354e",
    },
  },
  featured: {
    content: [
      { key: "title", label: "Título Principal", type: "text" },
      { key: "subtitle", label: "Subtítulo", type: "text" },
      { key: "linkText", label: "Texto del Enlace", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "Please, don't stop the music!",
      subtitle: "Users choice in this week!",
      linkText: "See all products",
      bgColor: "#5c9fa3",
      textColor: "#ffffff",
    },
  },
  whyus: {
    content: [{ key: "title", label: "Título de la Sección", type: "text" }],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "Why us?",
      bgColor: "#f5f5f5",
      textColor: "#1e354e",
    },
  },
  footer: {
    content: [
      { key: "brandName", label: "Nombre de la Marca", type: "text" },
      { key: "copyrightText", label: "Texto de Copyright", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      brandName: "Osoria",
      copyrightText: "© 2025 Betheme by Muffin group | All Rights Reserved | Powered by WordPress",
      bgColor: "#ffffff",
      textColor: "#666666",
    },
  },
  header: {
    content: [
      { key: "brandName", label: "Nombre de la Marca", type: "text" },
      { key: "tagline", label: "Texto del Banner", type: "text" },
    ],
    styles: [
      { key: "bannerBgColor", label: "Color de Fondo del Banner", type: "color" },
      { key: "bannerTextColor", label: "Color de Texto del Banner", type: "color" },
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "linkColor", label: "Color de Enlaces", type: "color" },
    ],
    defaults: {
      brandName: "Osoria",
      tagline: "Big Sale! Hurry up! Sale ends in 2025",
      bannerBgColor: "#c4faff",
      bannerTextColor: "#005aa1",
      bgColor: "#ffffff",
      linkColor: "#005aa1",
    },
  },
  about: {
    content: [
      { key: "title", label: "Título", type: "textarea" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "ceoName", label: "Nombre del CEO", type: "text" },
      { key: "ceoTitle", label: "Título del CEO", type: "text" },
      { key: "ceoImage", label: "URL Imagen del CEO", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
  },
  story: {
    content: [
      { key: "title", label: "Título", type: "textarea" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "buttonText", label: "Texto del Botón", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
  },
  value: {
    content: [
      { key: "title", label: "Título", type: "textarea" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "statNumber", label: "Número Estadística", type: "text" },
      { key: "statText", label: "Texto Estadística", type: "text" },
      { key: "buttonText", label: "Texto del Botón", type: "text" },
      { key: "backgroundImage", label: "URL Imagen de Fondo", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
  },
  testimonials: {
    content: [
      { key: "title", label: "Título de la Sección", type: "textarea" },
      { key: "description", label: "Descripción de la Sección", type: "textarea" },
      {
        key: "testimonials",
        label: "Testimonios",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "quote", label: "Testimonio", type: "textarea" },
          { key: "author", label: "Autor", type: "text" },
          { key: "role", label: "Cargo", type: "text" },
          { key: "image", label: "URL Imagen", type: "text" },
        ],
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
  },
  trending: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "products",
        label: "Productos en Tendencia",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "name", label: "Nombre", type: "text" },
          { key: "description", label: "Descripción", type: "text" },
          { key: "image", label: "URL Imagen", type: "text" },
        ],
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
  },
}

export function EditorPanel() {
  const { selectedComponent, selectComponent, componentEdits, updateComponentEdit, clearComponentEdits } = useAdmin()
  const { styles: globalStyles } = useStyles()
  const [saving, setSaving] = useState(false)
  const [localValues, setLocalValues] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState("content")

  useEffect(() => {
    if (selectedComponent) {
      const config = COMPONENT_FIELDS[selectedComponent]
      const currentStyles = globalStyles.get(selectedComponent) || {}
      const edits = componentEdits.get(selectedComponent) || {}

      const mergedValues = {
        ...(config?.defaults || {}),
        ...currentStyles,
        ...edits,
      }

      setLocalValues(mergedValues)
      console.log("[v0] Loaded editor values for", selectedComponent, mergedValues)
    }
  }, [selectedComponent, globalStyles, componentEdits])

  if (!selectedComponent) {
    return (
      <div className="w-96 bg-background border-l border-border h-full flex items-center justify-center p-8">
        <div className="text-center text-muted-foreground">
          <p className="text-lg font-medium mb-2">Editor de Componentes</p>
          <p className="text-sm">Haz clic en cualquier sección de la página para editarla</p>
        </div>
      </div>
    )
  }

  const config = COMPONENT_FIELDS[selectedComponent]
  if (!config) return null

  const componentLabel = selectedComponent.charAt(0).toUpperCase() + selectedComponent.slice(1)

  const handleInputChange = (key: string, value: any) => {
    setLocalValues((prev) => ({ ...prev, [key]: value }))
    updateComponentEdit(selectedComponent, key, value)
  }

  const handleArrayItemChange = (arrayKey: string, index: number, fieldKey: string, value: any) => {
    const currentArray = localValues[arrayKey] || []
    const updatedArray = [...currentArray]
    updatedArray[index] = { ...updatedArray[index], [fieldKey]: value }
    handleInputChange(arrayKey, updatedArray)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const edits = componentEdits.get(selectedComponent) || {}
      await updateComponentStyle(selectedComponent, edits)
      toast.success("Cambios guardados correctamente")
      clearComponentEdits(selectedComponent)
    } catch (error) {
      toast.error("Error al guardar los cambios")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    const currentStyles = globalStyles.get(selectedComponent) || {}
    setLocalValues(currentStyles)
    clearComponentEdits(selectedComponent)
    toast.info("Cambios descartados")
  }

  const hasChanges = componentEdits.has(selectedComponent)

  return (
    <div className="w-96 bg-background border-l border-border h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Editando: {componentLabel}</h2>
        <Button variant="ghost" size="icon" onClick={() => selectComponent(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4">
          <TabsTrigger value="content" className="flex-1">
            <Type className="h-4 w-4 mr-2" />
            Contenido
          </TabsTrigger>
          <TabsTrigger value="styles" className="flex-1">
            <Palette className="h-4 w-4 mr-2" />
            Estilos
          </TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenido del Componente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.content.map((field) => (
                <div key={field.key} className="space-y-2">
                  {field.isArray ? (
                    <div>
                      <Label className="mb-2 block">{field.label}</Label>
                      {(localValues[field.key] || []).map((item: any, index: number) => (
                        <Card key={index} className="mb-3">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {field.arrayFields?.map((subField) => (
                              <div key={subField.key} className="space-y-1">
                                <Label className="text-xs">{subField.label}</Label>
                                {subField.type === "textarea" ? (
                                  <Textarea
                                    value={item[subField.key] || ""}
                                    onChange={(e) =>
                                      handleArrayItemChange(field.key, index, subField.key, e.target.value)
                                    }
                                    rows={2}
                                  />
                                ) : (
                                  <Input
                                    type={subField.type}
                                    value={item[subField.key] || ""}
                                    onChange={(e) => {
                                      const value = subField.type === "number" ? Number(e.target.value) : e.target.value
                                      handleArrayItemChange(field.key, index, subField.key, value)
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : field.type === "textarea" ? (
                    <>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Textarea
                        id={field.key}
                        value={localValues[field.key] || ""}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                        rows={3}
                      />
                    </>
                  ) : (
                    <>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      <Input
                        id={field.key}
                        type={field.type}
                        value={localValues[field.key] || ""}
                        onChange={(e) => handleInputChange(field.key, e.target.value)}
                      />
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Styles Tab */}
        <TabsContent value="styles" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estilos del Componente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.styles.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`style-${field.key}`}>{field.label}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`style-${field.key}`}
                      type={field.type}
                      value={localValues[field.key] || ""}
                      onChange={(e) => handleInputChange(field.key, e.target.value)}
                      className={field.type === "color" ? "h-10" : ""}
                    />
                    {field.type === "color" && (
                      <div
                        className="w-10 h-10 rounded border"
                        style={{ backgroundColor: localValues[field.key] || "#000000" }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button className="w-full" onClick={handleSave} disabled={!hasChanges || saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
        <Button variant="outline" className="w-full bg-transparent" onClick={handleReset} disabled={!hasChanges}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Descartar Cambios
        </Button>
      </div>
    </div>
  )
}
