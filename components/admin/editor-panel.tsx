"use client"

import { useAdmin } from "@/contexts/admin-context"
import { useStyles } from "@/contexts/styles-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { X, Save, RotateCcw, Type, Palette, Plus, Trash2 } from "lucide-react"
import { useState, useEffect } from "react"
import { updateComponentStyle } from "@/lib/supabase/styles-api"
import { toast } from "sonner"
import { ImageUpload } from "./image-upload"

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
      {
        key: "products",
        label: "Productos del Carrusel",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "label", label: "Etiqueta", type: "text" },
          { key: "title", label: "Título Principal", type: "text" },
          { key: "subtitle", label: "Subtítulo", type: "text" },
          { key: "description", label: "Descripción", type: "textarea" },
          { key: "buttonText", label: "Texto del Botón", type: "text" },
          { key: "image", label: "URL de la Imagen", type: "image" },
        ],
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
      { key: "buttonColor", label: "Color del Botón", type: "color" },
      { key: "buttonTextColor", label: "Color del Texto del Botón", type: "color" },
      { key: "barColor", label: "Color de la Barra Inferior", type: "color" },
    ],
    defaults: {
      products: [
        {
          label: "Electrónica",
          title: "BALFE",
          subtitle: "NUEVO MODELO",
          description: "Descubre la última tecnología en dispositivos electrónicos. Calidad premium y diseño innovador para una experiencia única.",
          buttonText: "Comprar ahora",
          image: "/black-smart-speaker.jpg",
        },
        {
          label: "Audio",
          title: "PREMIUM",
          subtitle: "HEADPHONES",
          description: "Experimenta el sonido de alta calidad con nuestros auriculares premium. Diseño ergonómico y cancelación de ruido activa.",
          buttonText: "Ver más",
          image: "/premium-headphones.png",
        },
        {
          label: "Accesorios",
          title: "LAPTOP STAND",
          subtitle: "ERGONÓMICO",
          description: "Mejora tu espacio de trabajo con nuestro soporte para laptop. Diseño moderno y ajustable para mayor comodidad.",
          buttonText: "Comprar ahora",
          image: "/laptop-stand.png",
        },
        {
          label: "Proyección",
          title: "MINI PROJECTOR",
          subtitle: "PORTÁTIL",
          description: "Lleva el cine contigo. Proyector compacto con alta resolución y conectividad inalámbrica para tus presentaciones.",
          buttonText: "Descubrir",
          image: "/mini-projector.jpg",
        },
      ],
      bgColor: "#4a5568",
      textColor: "#ffffff",
      buttonColor: "#005aa1",
      buttonTextColor: "#ffffff",
      barColor: "#005aa1",
    },
  },
  popular: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "items",
        label: "Productos",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "title", label: "Título del Producto", type: "text" },
          { key: "price", label: "Precio", type: "text" },
          { key: "image", label: "URL de la Imagen", type: "image" },
        ],
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "Lo más vendido",
      items: [
        { title: "Bocinas Bluetooth", price: "Desde $356", image: "/bluetooth-speaker-modern.jpg" },
        { title: "Auriculares y Audífonos", price: "Desde $29", image: "/premium-headphones.png" },
        { title: "Soportes para Laptop", price: "Desde $82", image: "/laptop-stand.png" },
        { title: "Proyectores", price: "Desde $199", image: "/mini-projector.jpg" },
        { title: "Bocinas Inteligentes", price: "Desde $89", image: "/black-smart-speaker.jpg" },
        { title: "Audífonos Inalámbricos", price: "Desde $45", image: "/green-earphones-product.jpg" },
        { title: "Fundas para Teléfono", price: "Desde $25", image: "/modern-phone-case-product.jpg" },
      ],
      bgColor: "#ffffff",
      textColor: "#1e354e",
    },
  },
  products: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "products",
        label: "Productos",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "name", label: "Nombre del Producto", type: "text" },
          { key: "category", label: "Categoría", type: "text" },
          { key: "price", label: "Precio", type: "text" },
          { key: "image", label: "URL de la Imagen", type: "image" },
        ],
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "Productos populares",
      products: [
        { name: "BeShow Volcano", category: "Proyectores", price: "$1,420.00", image: "/white-projector.jpg" },
        { name: "Soporte para Laptop Desk MUO-g", category: "Soportes", price: "$82.00", image: "/laptop-stand.png" },
        { name: "BeShow Volcano", category: "Proyectores", price: "$1,420.00", image: "/white-projector.jpg" },
      ],
      bgColor: "#ffffff",
      textColor: "#1e354e",
    },
  },
  featured: {
    content: [
      { key: "title", label: "Título Principal", type: "text" },
      { key: "subtitle", label: "Subtítulo", type: "text" },
      { key: "linkText", label: "Texto del Enlace", type: "text" },
      { key: "mainImage", label: "URL Imagen Principal (Banner)", type: "image" },
      { key: "productName", label: "Nombre del Producto (Cuadro pequeño)", type: "text" },
      { key: "originalPrice", label: "Precio Original (Cuadro pequeño)", type: "text" },
      { key: "salePrice", label: "Precio de Oferta (Cuadro pequeño)", type: "text" },
      { key: "productImage", label: "URL Imagen del Producto (Cuadro pequeño)", type: "image" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "¡Por favor, no detengas la música!",
      subtitle: "La elección de los usuarios en este mundo",
      linkText: "Ver todos los productos",
      mainImage: "/woman-wearing-headphones-smiling.jpg",
      productName: "Auriculares BelPhones XTRM",
      originalPrice: "$99.99",
      salePrice: "$79.00",
      productImage: "/green-earphones-product.jpg",
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
  const { selectedComponent, selectComponent, componentEdits, updateComponentEdit, clearComponentEdits, isEditMode, toggleEditMode } = useAdmin()
  const { styles: globalStyles, refreshStyles } = useStyles()
  const [saving, setSaving] = useState(false)
  const [localValues, setLocalValues] = useState<Record<string, any>>({})
  const [activeTab, setActiveTab] = useState("content")

  // Función para cerrar completamente el panel
  // Siempre cierra el modo de edición completamente, no solo deselecciona el componente
  const handleClosePanel = () => {
    toggleEditMode()
  }

  // Efecto para cargar valores iniciales cuando cambia el componente seleccionado
  // NO incluir componentEdits en las dependencias para evitar bucles infinitos
  useEffect(() => {
    if (selectedComponent) {
      const config = COMPONENT_FIELDS[selectedComponent]
      if (!config) {
        console.warn("[Editor] No config found for component:", selectedComponent)
        return
      }
      
      const currentStyles = globalStyles.get(selectedComponent) || {}
      const edits = componentEdits.get(selectedComponent) || {}

      // Combinar valores: defaults primero, luego estilos de BD, luego ediciones locales
      const mergedValues = {
        ...(config?.defaults || {}),
        ...currentStyles,
        ...edits,
      }

      // Solo actualizar si los valores realmente cambiaron para evitar bucles infinitos
      setLocalValues((prev) => {
        const prevStr = JSON.stringify(prev)
        const newStr = JSON.stringify(mergedValues)
        if (prevStr === newStr) {
          return prev // No actualizar si son iguales
        }
        return mergedValues
      })
      
      console.log("[Editor] Loaded values for", selectedComponent, {
        defaults: config?.defaults,
        fromDB: currentStyles,
        edits: edits,
        merged: mergedValues
      })
    } else {
      // Limpiar valores cuando no hay componente seleccionado
      setLocalValues({})
    }
    // Solo actualizar cuando cambia el componente seleccionado o los estilos globales
    // NO incluir componentEdits para evitar bucles infinitos
    // Los cambios en componentEdits se manejan directamente en handleInputChange
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComponent, globalStyles])

  // No mostrar el panel si no está en modo edición (después de todos los hooks)
  if (!isEditMode) {
    return null
  }

  if (!selectedComponent) {
    return (
      <div className="fixed right-0 top-0 h-screen w-full md:w-96 bg-background border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header con botón de cierre */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-base md:text-lg font-semibold">Editor de Componentes</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => toggleEditMode()}
            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Cerrar panel de edición"
            title="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        {/* Contenido centrado */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <p className="text-xs md:text-sm">Haz clic en cualquier sección de la página para editarla</p>
          </div>
        </div>
      </div>
    )
  }

  const config = COMPONENT_FIELDS[selectedComponent]
  if (!config) {
    return (
      <>
        {/* Overlay oscuro en móviles */}
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={handleClosePanel}
          aria-label="Cerrar panel"
        />
        <div className="fixed right-0 top-0 h-screen w-full md:w-96 bg-background border-l border-border z-50 flex flex-col shadow-2xl">
          {/* Header con botón de cierre */}
          <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
            <h2 className="text-base md:text-lg font-semibold">Componente no configurado</h2>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClosePanel}
              className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
              aria-label="Cerrar panel de edición"
              title="Cerrar panel"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          {/* Contenido centrado */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center text-muted-foreground">
              <p className="text-xs md:text-sm">Este componente no tiene configuración de edición</p>
            </div>
          </div>
        </div>
      </>
    )
  }

  const componentLabel = selectedComponent.charAt(0).toUpperCase() + selectedComponent.slice(1)

  const handleInputChange = (key: string, value: any) => {
    // Actualizar estado local de forma optimista
    setLocalValues((prev) => {
      // Solo actualizar si el valor realmente cambió
      if (prev[key] === value) {
        return prev
      }
      return { ...prev, [key]: value }
    })
    
    // Actualizar ediciones en el contexto (esto puede disparar efectos, pero no debe causar bucles)
    updateComponentEdit(selectedComponent, key, value)
    
    // Aplicar cambios en tiempo real para estilos (solo para colores)
    if (key === "bgColor" || key === "textColor" || key.includes("Color")) {
      if (typeof document !== "undefined" && selectedComponent) {
        const root = document.documentElement
        const cssVar = `--${selectedComponent}-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
        root.style.setProperty(cssVar, value)
        
        // También aplicar directamente al componente si es posible
        const componentElement = document.querySelector(`[data-component="${selectedComponent}"]`)
        if (componentElement) {
          if (key === "bgColor") {
            ;(componentElement as HTMLElement).style.backgroundColor = value
          } else if (key === "textColor") {
            ;(componentElement as HTMLElement).style.color = value
          }
        }
      }
    }
  }

  const handleArrayItemChange = (arrayKey: string, index: number, fieldKey: string, value: any) => {
    const currentArray = localValues[arrayKey] || []
    const updatedArray = [...currentArray]
    updatedArray[index] = { ...updatedArray[index], [fieldKey]: value }
    handleInputChange(arrayKey, updatedArray)
  }

  const handleAddArrayItem = (arrayKey: string, arrayFields: any[]) => {
    const currentArray = localValues[arrayKey] || []
    const newItem: Record<string, any> = {}
    arrayFields.forEach((field) => {
      newItem[field.key] = ""
    })
    handleInputChange(arrayKey, [...currentArray, newItem])
  }

  const handleRemoveArrayItem = (arrayKey: string, index: number) => {
    const currentArray = localValues[arrayKey] || []
    const updatedArray = currentArray.filter((_: any, i: number) => i !== index)
    handleInputChange(arrayKey, updatedArray)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const edits = componentEdits.get(selectedComponent) || {}
      
      if (Object.keys(edits).length === 0) {
        toast.info("No hay cambios para guardar")
        setSaving(false)
        return
      }

      console.log("[Editor] Guardando cambios para", selectedComponent, edits)
      
      // Obtener estilos actuales de la BD
      const currentStyles = globalStyles.get(selectedComponent) || {}
      
      // Combinar estilos actuales con las ediciones
      const mergedStyles = {
        ...currentStyles,
        ...edits,
      }
      
      console.log("[Editor] Estilos combinados a guardar:", mergedStyles)
      
      // Guardar en Supabase
      const result = await updateComponentStyle(selectedComponent, mergedStyles)
      
      console.log("[Editor] Resultado del guardado:", result)
      
      // Refrescar estilos desde Supabase para asegurar sincronización
      await refreshStyles()
      
      // Actualizar localStorage inmediatamente
      try {
        const savedStyles = localStorage.getItem("osoria_component_styles")
        const styles = savedStyles ? JSON.parse(savedStyles) : {}
        styles[selectedComponent] = mergedStyles
        localStorage.setItem("osoria_component_styles", JSON.stringify(styles))
        
        // Aplicar estilos inmediatamente al DOM
        if (typeof document !== "undefined") {
          const root = document.documentElement
          Object.keys(mergedStyles).forEach((key) => {
            if (key === "bgColor" || key === "textColor" || key.includes("Color")) {
              const cssVar = `--${selectedComponent}-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`
              root.style.setProperty(cssVar, mergedStyles[key])
              
              // También aplicar directamente al componente
              const componentElement = document.querySelector(`[data-component="${selectedComponent}"]`)
              if (componentElement) {
                if (key === "bgColor") {
                  ;(componentElement as HTMLElement).style.backgroundColor = mergedStyles[key]
                } else if (key === "textColor") {
                  ;(componentElement as HTMLElement).style.color = mergedStyles[key]
                }
              }
            }
          })
        }
      } catch (e) {
        console.warn("[Editor] Error saving to localStorage:", e)
      }
      
      toast.success("Cambios guardados correctamente")
      clearComponentEdits(selectedComponent)
      
      // Forzar re-render del componente actualizando localValues
      const config = COMPONENT_FIELDS[selectedComponent]
      const updatedStyles = globalStyles.get(selectedComponent) || {}
      setLocalValues({
        ...(config?.defaults || {}),
        ...updatedStyles,
      })
    } catch (error) {
      toast.error("Error al guardar los cambios")
      console.error("[Editor] Error completo:", error)
      if (error instanceof Error) {
        console.error("[Editor] Mensaje:", error.message)
        console.error("[Editor] Stack:", error.stack)
      }
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
    <>
      {/* Overlay oscuro en móviles */}
      {selectedComponent && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={handleClosePanel}
          aria-label="Cerrar panel"
        />
      )}
      
      <div 
        className="fixed right-0 top-0 h-screen w-full md:w-96 bg-background border-l border-border z-50 flex flex-col shadow-2xl"
        data-editor-panel={selectedComponent ? "open" : "closed"}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-base md:text-lg font-semibold">Editando: {componentLabel}</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleClosePanel}
            className="h-9 w-9 hover:bg-destructive/10 hover:text-destructive"
            aria-label="Cerrar panel de edición"
            title="Cerrar panel"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-4 flex-shrink-0">
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
        <TabsContent value="content" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0 min-h-0 custom-scrollbar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contenido del Componente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.content.map((field) => (
                <div key={field.key} className="space-y-2">
                  {field.isArray ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2 sticky top-0 bg-background z-10 py-2 -mx-2 px-2 border-b border-border">
                        <Label className="font-semibold">{field.label}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddArrayItem(field.key, field.arrayFields || [])}
                          className="h-8"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Agregar
                        </Button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {(localValues[field.key] || []).map((item: any, index: number) => (
                        <Card key={index} className="mb-3">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">Item {index + 1}</CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveArrayItem(field.key, index)}
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            {field.arrayFields?.map((subField) => (
                              <div key={subField.key} className="space-y-1">
                                {subField.type === "image" || subField.key.toLowerCase().includes("image") ? (
                                  <ImageUpload
                                    value={item[subField.key] || ""}
                                    onChange={(url) => handleArrayItemChange(field.key, index, subField.key, url)}
                                    label={subField.label}
                                    context={`${selectedComponent}-${field.key}-${subField.key}-${index + 1}`}
                                  />
                                ) : subField.type === "textarea" ? (
                                  <>
                                    <Label className="text-xs">{subField.label}</Label>
                                    <Textarea
                                      value={item[subField.key] || ""}
                                      onChange={(e) =>
                                        handleArrayItemChange(field.key, index, subField.key, e.target.value)
                                      }
                                      rows={2}
                                    />
                                  </>
                                ) : (
                                  <>
                                    <Label className="text-xs">{subField.label}</Label>
                                    <Input
                                      type={subField.type}
                                      value={item[subField.key] || ""}
                                      onChange={(e) => {
                                        const value = subField.type === "number" ? Number(e.target.value) : e.target.value
                                        handleArrayItemChange(field.key, index, subField.key, value)
                                      }}
                                    />
                                  </>
                                )}
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                        ))}
                      </div>
                      {(!localValues[field.key] || localValues[field.key].length === 0) && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No hay items. Haz clic en "Agregar" para crear uno nuevo.
                        </div>
                      )}
                    </div>
                  ) : field.type === "image" || field.key.toLowerCase().includes("image") ? (
                    <ImageUpload
                      value={localValues[field.key] || ""}
                      onChange={(url) => handleInputChange(field.key, url)}
                      label={field.label}
                      context={`${selectedComponent}-${field.key}`}
                    />
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
        <TabsContent value="styles" className="flex-1 overflow-y-auto p-4 space-y-4 mt-0 min-h-0 custom-scrollbar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estilos del Componente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.styles && config.styles.length > 0 ? (
                config.styles.map((field) => {
                  const currentValue = localValues[field.key] || ""
                  const defaultValue = config.defaults?.[field.key] || ""
                  const displayValue = currentValue || defaultValue || ""
                  
                  return (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`style-${field.key}`} className="text-sm font-medium">
                        {field.label}
                      </Label>
                      <div className="flex gap-2 items-center">
                        <Input
                          id={`style-${field.key}`}
                          type={field.type}
                          value={currentValue}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          className={field.type === "color" ? "h-10 flex-1" : "flex-1"}
                          placeholder={field.type === "color" ? "#000000" : defaultValue || "Ingrese un valor..."}
                        />
                        {field.type === "color" && (
                          <div
                            className="w-12 h-12 rounded border-2 border-border cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                            style={{ backgroundColor: displayValue || "#000000" }}
                            onClick={() => {
                              const input = document.getElementById(`style-${field.key}`) as HTMLInputElement
                              if (input) input.click()
                            }}
                            title="Haz clic para abrir el selector de color"
                          />
                        )}
                      </div>
                      {displayValue && (
                        <p className="text-xs text-muted-foreground">
                          Valor: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{displayValue}</code>
                        </p>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Este componente no tiene estilos configurables
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
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
    </>
  )
}
