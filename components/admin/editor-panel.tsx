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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { updateComponentStyle } from "@/lib/supabase/styles-api"
import { toast } from "sonner"
import { ImageUpload } from "./image-upload"

const COMPONENT_FIELDS: Record<
  string,
  {
    content: Array<{ key: string; label: string; type: string; isArray?: boolean; arrayFields?: any[] }>
    styles: Array<{ key: string; label: string; type: string; options?: Array<{ value: string; label: string }> }>
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
      { key: "title", label: "Título Principal (Repostería)", type: "textarea" },
      { key: "description", label: "Descripción (Repostería)", type: "textarea" },
      { key: "backgroundImage", label: "Imagen de Fondo (Repostería)", type: "image" },
      { key: "primaryButtonText", label: "Texto Botón Primario (Repostería)", type: "text" },
      { key: "primaryButtonLink", label: "Link Botón Primario (Repostería)", type: "text" },
      { key: "secondaryButtonText", label: "Texto Botón Secundario (Repostería)", type: "text" },
      { key: "secondaryButtonLink", label: "Link Botón Secundario (Repostería)", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
      { key: "buttonColor", label: "Color del Botón", type: "color" },
      { key: "buttonTextColor", label: "Color del Texto del Botón", type: "color" },
      { key: "barColor", label: "Color de la Barra Inferior", type: "color" },
      { key: "titleTextColor", label: "Color del Texto del Título (Repostería)", type: "color" },
      { key: "descriptionTextColor", label: "Color del Texto de la Descripción (Repostería)", type: "color" },
      { key: "titleBorderEnabled", label: "Activar Borde en el Título", type: "checkbox" },
      { key: "titleBorderColor", label: "Color del Borde del Título", type: "color" },
      { key: "titleBorderWidth", label: "Ancho del Borde del Título (px)", type: "text" },
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
      // Valores por defecto para hero de repostería
      title: "",
      description: "Deliciosos pasteles, postres y dulces artesanales\nHechos con amor y los mejores ingredientes",
      backgroundImage: "/reposteria/pastel-boda.jpg",
      primaryButtonText: "Explorar Productos",
      primaryButtonLink: "/shop",
      secondaryButtonText: "Ver Catálogo",
      secondaryButtonLink: "/catalog",
      // Valores por defecto para estilos de repostería
      titleTextColor: "#ffffff",
      descriptionTextColor: "rgba(255, 255, 255, 0.9)",
      titleBorderEnabled: false,
      titleBorderColor: "#ffffff",
      titleBorderWidth: "2",
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
      { key: "logoImage", label: "Logo de la Empresa", type: "image" },
      { key: "logoImageDark", label: "Logo para Tema Oscuro (opcional)", type: "image" },
      { key: "searchPlaceholder", label: "Texto del Buscador", type: "text" },
      { key: "tagline", label: "Texto del Banner", type: "text" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo del Header", type: "color" },
      { key: "bannerBgColor", label: "Color de Fondo del Banner", type: "color" },
      { key: "bannerTextColor", label: "Color de Texto del Banner", type: "color" },
      { key: "menuButtonColor", label: "Color del Botón de Menú", type: "color" },
      { key: "menuButtonHoverBg", label: "Color de Fondo Hover del Botón de Menú", type: "color" },
      { key: "loginButtonColor", label: "Color del Botón de Iniciar Sesión", type: "color" },
      { key: "loginButtonHoverBg", label: "Color de Fondo Hover del Botón de Iniciar Sesión", type: "color" },
      { key: "iconColor", label: "Color de los Iconos (Corazón, Carrito, etc.)", type: "color" },
      { key: "iconHoverBg", label: "Color de Fondo Hover de los Iconos", type: "color" },
      { key: "searchIconColor", label: "Color del Icono de Búsqueda", type: "color" },
      { key: "searchBgColor", label: "Color de Fondo del Buscador", type: "color" },
      { key: "searchTextColor", label: "Color del Texto del Buscador", type: "color" },
      { key: "searchBorderColor", label: "Color del Borde del Buscador", type: "color" },
      { key: "linkColor", label: "Color de Enlaces de Navegación", type: "color" },
    ],
    defaults: {
      brandName: "Osoria",
      logoImage: "/logo-osoria.png",
      logoImageDark: "/logo-osoria-blanco.svg",
      searchPlaceholder: "Buscar...",
      tagline: "Big Sale! Hurry up! Sale ends in 2025",
      bgColor: "#ffffff",
      bannerBgColor: "#c4faff",
      bannerTextColor: "#005aa1",
      menuButtonColor: "#1a1a1a",
      menuButtonHoverBg: "#f5f5f5",
      loginButtonColor: "#1a1a1a",
      loginButtonHoverBg: "#f5f5f5",
      iconColor: "#1a1a1a",
      iconHoverBg: "#f5f5f5",
      searchIconColor: "#737373",
      searchBgColor: "#f5f5f5",
      searchTextColor: "#1a1a1a",
      searchBorderColor: "#e5e5e5",
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
    defaults: {
      title: "Sobre Nosotros",
      description: "Somos una pastelería artesanal dedicada a crear los más deliciosos pasteles, postres y dulces. Cada producto está hecho con ingredientes de la más alta calidad y mucho amor, para que puedas disfrutar de momentos especiales con cada bocado.",
    },
  },
  gallery: {
    content: [
      { key: "title", label: "Título de la Galería", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      {
        key: "images",
        label: "Imágenes de la Galería",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "src", label: "URL de la Imagen", type: "image" },
          { key: "alt", label: "Texto Alternativo (Alt)", type: "text" },
          { key: "title", label: "Título de la Imagen", type: "text" },
          { key: "category", label: "Categoría", type: "text" },
        ],
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
    ],
    defaults: {
      title: "Nuestro Mundo Dulce",
      description: "Descubre la creatividad y el arte detrás de cada producto que preparamos con amor",
      images: [
        {
          src: "/reposteria/cupcakes-decorados.jpg",
          alt: "Cupcakes decorados con sprinkles en colores pastel - azul, amarillo y rosa",
          title: "Cupcakes Decorados",
          category: "Productos"
        },
        {
          src: "/reposteria/tarta-berries.jpg",
          alt: "Tarta de frutas con berries frescos, azúcar glass y menta",
          title: "Tarta de Berries",
          category: "Productos"
        },
        {
          src: "/reposteria/macarons-colores.jpg",
          alt: "Macarons en colores pastel - verde, rosa, amarillo y blanco",
          title: "Macarons Artesanales",
          category: "Productos"
        },
        {
          src: "/reposteria/mini-cakes-cheesecakes.jpg",
          alt: "Mini cakes y cheesecakes decorados con berries, chocolate y caramelo",
          title: "Mini Cakes y Cheesecakes",
          category: "Productos"
        },
        {
          src: "/reposteria/galletas-chocolate.jpg",
          alt: "Galletas de chocolate chip caseras",
          title: "Galletas de Chocolate",
          category: "Productos"
        },
        {
          src: "/reposteria/pastel-cumpleanos.jpg",
          alt: "Pastel de cumpleaños decorado con temática festiva y colorida",
          title: "Pasteles de Cumpleaños",
          category: "Productos"
        },
        {
          src: "/reposteria/pastel-boda.jpg",
          alt: "Pastel de boda estilo naked cake decorado con flores frescas",
          title: "Pasteles de Boda",
          category: "Productos"
        },
        {
          src: "/reposteria/herramientas-decoracion.jpg",
          alt: "Herramientas de decoración de pasteles - boquillas, pinceles y fondant",
          title: "Herramientas de Decoración",
          category: "Accesorios"
        },
        {
          src: "/reposteria/sprinkles-candies.jpg",
          alt: "Sprinkles y candies coloridos para decorar postres",
          title: "Sprinkles y Candies",
          category: "Decoraciones"
        },
        {
          src: "/reposteria/chocolates-truffles.jpg",
          alt: "Deliciosos chocolates y truffles artesanales",
          title: "Chocolates Artesanales",
          category: "Productos"
        },
        {
          src: "/reposteria/empaque-presentacion.jpg",
          alt: "Elementos de empaque y presentación para productos de repostería",
          title: "Empaque y Presentación",
          category: "Accesorios"
        }
      ],
    },
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
  site_background: {
    content: [],
    styles: [
      { 
        key: "type", 
        label: "Tipo de Fondo", 
        type: "select",
        options: [
          { value: "color", label: "Color" },
          { value: "image", label: "Imagen" },
        ]
      },
      { key: "backgroundColor", label: "Color de Fondo", type: "color" },
      { key: "backgroundImage", label: "Imagen de Fondo", type: "image" },
      { 
        key: "backgroundPosition", 
        label: "Posición de la Imagen", 
        type: "select",
        options: [
          { value: "center", label: "Centro" },
          { value: "top", label: "Superior" },
          { value: "bottom", label: "Inferior" },
          { value: "left", label: "Izquierda" },
          { value: "right", label: "Derecha" },
          { value: "top left", label: "Superior Izquierda" },
          { value: "top right", label: "Superior Derecha" },
          { value: "bottom left", label: "Inferior Izquierda" },
          { value: "bottom right", label: "Inferior Derecha" },
        ]
      },
      { 
        key: "backgroundRepeat", 
        label: "Repetición", 
        type: "select",
        options: [
          { value: "no-repeat", label: "No repetir" },
          { value: "repeat", label: "Repetir" },
          { value: "repeat-x", label: "Repetir horizontal" },
          { value: "repeat-y", label: "Repetir vertical" },
        ]
      },
      { 
        key: "backgroundSize", 
        label: "Tamaño", 
        type: "select",
        options: [
          { value: "cover", label: "Cubrir (cover)" },
          { value: "contain", label: "Contener (contain)" },
          { value: "auto", label: "Automático" },
          { value: "100% 100%", label: "Estirar" },
        ]
      },
    ],
    defaults: {
      type: "color",
      backgroundColor: "#ffffff",
      backgroundImage: "",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "cover",
    },
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
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
          <div className="text-center text-muted-foreground">
            <p className="text-xs md:text-sm mb-4">Haz clic en cualquier sección de la página para editarla</p>
          </div>
          {/* Botón para configurar fondo del sitio */}
          <Button
            variant="outline"
            onClick={() => selectComponent("site_background")}
            className="w-full max-w-xs"
          >
            <Palette className="h-4 w-4 mr-2" />
            Configurar Fondo del Sitio
          </Button>
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
    
    // Aplicar cambios en tiempo real para el fondo del sitio
    if (selectedComponent === "site_background") {
      if (typeof document !== "undefined") {
        const body = document.body
        const type = localValues.type || value
        
        if (key === "type") {
          // Cuando cambia el tipo, aplicar la configuración completa
          const bgType = value
          if (bgType === "color") {
            body.style.backgroundColor = localValues.backgroundColor || "#ffffff"
            body.style.backgroundImage = "none"
          } else if (bgType === "image" && localValues.backgroundImage) {
            body.style.backgroundColor = localValues.backgroundColor || "transparent"
            body.style.backgroundImage = `url(${localValues.backgroundImage})`
            body.style.backgroundPosition = localValues.backgroundPosition || "center"
            body.style.backgroundRepeat = localValues.backgroundRepeat || "no-repeat"
            body.style.backgroundSize = localValues.backgroundSize || "cover"
            body.style.backgroundAttachment = "fixed"
          }
        } else if (key === "backgroundColor") {
          body.style.backgroundColor = value
          if (type === "image" && localValues.backgroundImage) {
            // Mantener la imagen si existe
            body.style.backgroundImage = `url(${localValues.backgroundImage})`
          }
        } else if (key === "backgroundImage") {
          if (value && type === "image") {
            body.style.backgroundImage = `url(${value})`
            body.style.backgroundColor = localValues.backgroundColor || "transparent"
            body.style.backgroundPosition = localValues.backgroundPosition || "center"
            body.style.backgroundRepeat = localValues.backgroundRepeat || "no-repeat"
            body.style.backgroundSize = localValues.backgroundSize || "cover"
            body.style.backgroundAttachment = "fixed"
          } else {
            body.style.backgroundImage = "none"
          }
        } else if (key === "backgroundPosition" || key === "backgroundRepeat" || key === "backgroundSize") {
          if (type === "image" && localValues.backgroundImage) {
            const styleKey = key.replace(/([A-Z])/g, "-$1").toLowerCase()
            body.style.setProperty(styleKey, value as string)
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
                      // Configuración específica para logos
                      recommendedWidth={field.key.toLowerCase().includes("logo") ? 240 : undefined}
                      recommendedHeight={field.key.toLowerCase().includes("logo") ? 80 : undefined}
                      fileTypes={field.key.toLowerCase().includes("logo") ? ["PNG", "SVG", "JPG", "WEBP"] : undefined}
                      accept={field.key.toLowerCase().includes("logo") ? "image/png,image/svg+xml,image/jpeg,image/jpg,image/webp" : undefined}
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
                  
                  // Mostrar/ocultar campos según el tipo de fondo seleccionado
                  if (selectedComponent === "site_background") {
                    if (field.key === "backgroundColor" && localValues.type === "image") {
                      return null // Ocultar color si es imagen
                    }
                    if (field.key === "backgroundImage" && localValues.type === "color") {
                      return null // Ocultar imagen si es color
                    }
                    if (field.key === "backgroundPosition" || field.key === "backgroundRepeat" || field.key === "backgroundSize") {
                      if (localValues.type === "color") {
                        return null // Ocultar opciones de imagen si es color
                      }
                    }
                  }
                  
                  return (
                    <div key={field.key} className="space-y-2">
                      <Label htmlFor={`style-${field.key}`} className="text-sm font-medium">
                        {field.label}
                      </Label>
                      {field.type === "select" && field.options ? (
                        <Select
                          value={currentValue || defaultValue}
                          onValueChange={(value) => handleInputChange(field.key, value)}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder={`Selecciona ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === "image" || field.key.toLowerCase().includes("image") ? (
                        <ImageUpload
                          value={currentValue || ""}
                          onChange={(url) => handleInputChange(field.key, url)}
                          label={field.label}
                          context={`${selectedComponent}-${field.key}`}
                        />
                      ) : field.type === "checkbox" ? (
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`style-${field.key}`}
                            checked={currentValue === "true" || currentValue === true || currentValue === "1"}
                            onCheckedChange={(checked) => handleInputChange(field.key, checked ? "true" : "false")}
                          />
                          <Label htmlFor={`style-${field.key}`} className="text-sm font-normal cursor-pointer">
                            {field.label}
                          </Label>
                        </div>
                      ) : (
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
                      )}
                      {displayValue && field.type !== "select" && (
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
