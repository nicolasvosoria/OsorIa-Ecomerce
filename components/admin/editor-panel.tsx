"use client";

import { useAdmin } from "@/contexts/admin-context";
import { useStyles } from "@/contexts/styles-context";
import { useStore } from "@/contexts/store-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  X,
  Save,
  RotateCcw,
  Type,
  Palette,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { updateComponentStyle } from "@/lib/supabase/styles-api";
import { toast } from "sonner";
import { ImageUpload } from "./image-upload";
import { getStoreId } from "@/lib/utils/store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HERO_HOTSPOT_ANCHOR_OPTIONS,
  HERO_PRODUCT_PLACEMENT_OPTIONS,
  HERO_SECONDARY_PRODUCT_PRESET_OPTIONS,
  HERO_TEXT_SIZE_OPTIONS,
  createNextHeroHotspotId,
  toHeroLayerModel,
  updateHeroSlideLayer,
  type HeroLayerId,
  type HeroHotspot,
} from "@/lib/hero/hero-layer-model";

const HERO_LAYER_OPTIONS: Array<{ value: HeroLayerId; label: string }> = [
  { value: "background", label: "Fondo" },
  { value: "product", label: "Producto" },
  { value: "content", label: "Contenido" },
  { value: "overlay", label: "Contraste" },
  { value: "cta", label: "Acción" },
  { value: "hotspots", label: "Hotspots" },
];

const COMPONENT_FIELDS: Record<
  string,
  {
    content: Array<{
      key: string;
      label: string;
      type: string;
      isArray?: boolean;
      arrayFields?: any[];
      options?: Array<{ value: string; label: string }>;
    }>;
    styles: Array<{
      key: string;
      label: string;
      type: string;
      options?: Array<{ value: string; label: string }>;
    }>;
    defaults?: Record<string, any>;
  }
> = {
  hero: {
    content: [
      {
        key: "layoutMode",
        label: "Diseño del Banner",
        type: "select",
        options: [
          { value: "split", label: "Split" },
          { value: "full-image", label: "Full Image" },
        ],
      },
      {
        key: "imageFit",
        label: "Ajuste de Imagen",
        type: "select",
        options: [
          { value: "cover", label: "Cover (rellenar recortando)" },
          { value: "contain", label: "Contain (mostrar completa)" },
        ],
      },
      {
        key: "imagePositionX",
        label: "Posición Horizontal de Imagen",
        type: "select",
        options: [
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centro" },
          { value: "right", label: "Derecha" },
        ],
      },
      {
        key: "imagePositionY",
        label: "Posición Vertical de Imagen",
        type: "select",
        options: [
          { value: "top", label: "Arriba" },
          { value: "center", label: "Centro" },
          { value: "bottom", label: "Abajo" },
        ],
      },
      {
        key: "fullImageContentAlign",
        label: "Alineación de Contenido",
        type: "select",
        options: [
          { value: "left", label: "Izquierda" },
          { value: "center", label: "Centro" },
          { value: "right", label: "Derecha" },
        ],
      },
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
      {
        key: "buttonTextColor",
        label: "Color del Texto del Botón",
        type: "color",
      },
      { key: "barColor", label: "Color de la Barra Inferior", type: "color" },
      { key: "overlayColor", label: "Color de Superposición", type: "color" },
      {
        key: "overlayOpacity",
        label: "Opacidad de Superposición",
        type: "text",
      },
    ],
    defaults: {
      layoutMode: "split",
      imageFit: "cover",
      imagePositionX: "center",
      imagePositionY: "center",
      fullImageContentAlign: "left",
      products: [
        {
          label: "Electrónica",
          title: "BALFE",
          subtitle: "NUEVO MODELO",
          description:
            "Descubre la última tecnología en dispositivos electrónicos. Calidad premium y diseño innovador para una experiencia única.",
          buttonText: "Comprar ahora",
          image: "/black-smart-speaker.jpg",
        },
        {
          label: "Audio",
          title: "PREMIUM",
          subtitle: "HEADPHONES",
          description:
            "Experimenta el sonido de alta calidad con nuestros auriculares premium. Diseño ergonómico y cancelación de ruido activa.",
          buttonText: "Ver más",
          image: "/premium-headphones.png",
        },
        {
          label: "Accesorios",
          title: "LAPTOP STAND",
          subtitle: "ERGONÓMICO",
          description:
            "Mejora tu espacio de trabajo con nuestro soporte para laptop. Diseño moderno y ajustable para mayor comodidad.",
          buttonText: "Comprar ahora",
          image: "/laptop-stand.png",
        },
        {
          label: "Proyección",
          title: "MINI PROJECTOR",
          subtitle: "PORTÁTIL",
          description:
            "Lleva el cine contigo. Proyector compacto con alta resolución y conectividad inalámbrica para tus presentaciones.",
          buttonText: "Descubrir",
          image: "/mini-projector.jpg",
        },
      ],
      bgColor: "#4a5568",
      textColor: "#ffffff",
      buttonColor: "#005aa1",
      buttonTextColor: "#ffffff",
      barColor: "#005aa1",
      overlayColor: "#101828",
      overlayOpacity: "0.45",
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
        {
          title: "Bocinas Bluetooth",
          price: "Desde $356",
          image: "/bluetooth-speaker-modern.jpg",
        },
        {
          title: "Auriculares y Audífonos",
          price: "Desde $29",
          image: "/premium-headphones.png",
        },
        {
          title: "Soportes para Laptop",
          price: "Desde $82",
          image: "/laptop-stand.png",
        },
        {
          title: "Proyectores",
          price: "Desde $199",
          image: "/mini-projector.jpg",
        },
        {
          title: "Bocinas Inteligentes",
          price: "Desde $89",
          image: "/black-smart-speaker.jpg",
        },
        {
          title: "Audífonos Inalámbricos",
          price: "Desde $45",
          image: "/green-earphones-product.jpg",
        },
        {
          title: "Fundas para Teléfono",
          price: "Desde $25",
          image: "/modern-phone-case-product.jpg",
        },
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
        {
          name: "BeShow Volcano",
          category: "Proyectores",
          price: "$1,420.00",
          image: "/white-projector.jpg",
        },
        {
          name: "Soporte para Laptop Desk MUO-g",
          category: "Soportes",
          price: "$82.00",
          image: "/laptop-stand.png",
        },
        {
          name: "BeShow Volcano",
          category: "Proyectores",
          price: "$1,420.00",
          image: "/white-projector.jpg",
        },
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
      {
        key: "mainImage",
        label: "URL Imagen Principal (Banner)",
        type: "image",
      },
      {
        key: "productName",
        label: "Nombre del Producto (Cuadro pequeño)",
        type: "text",
      },
      {
        key: "originalPrice",
        label: "Precio Original (Cuadro pequeño)",
        type: "text",
      },
      {
        key: "salePrice",
        label: "Precio de Oferta (Cuadro pequeño)",
        type: "text",
      },
      {
        key: "productImage",
        label: "URL Imagen del Producto (Cuadro pequeño)",
        type: "image",
      },
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
      copyrightText:
        "© 2025 Betheme by Muffin group | All Rights Reserved | Powered by WordPress",
      bgColor: "#ffffff",
      textColor: "#666666",
    },
  },
  header: {
    content: [
      { key: "brandName", label: "Nombre de la Marca", type: "text" },
      { key: "logoImage", label: "Logo de la Empresa", type: "image" },
      {
        key: "logoImageDark",
        label: "Logo para Tema Oscuro (opcional)",
        type: "image",
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo del Header", type: "color" },
      {
        key: "bannerBgColor",
        label: "Color de Fondo del Banner",
        type: "color",
      },
      {
        key: "bannerTextColor",
        label: "Color de Texto del Banner",
        type: "color",
      },
      {
        key: "menuButtonColor",
        label: "Color del Botón de Menú",
        type: "color",
      },
      {
        key: "menuButtonHoverBg",
        label: "Color de Fondo Hover del Botón de Menú",
        type: "color",
      },
      {
        key: "loginButtonColor",
        label: "Color del Botón de Iniciar Sesión",
        type: "color",
      },
      {
        key: "loginButtonHoverBg",
        label: "Color de Fondo Hover del Botón de Iniciar Sesión",
        type: "color",
      },
      {
        key: "iconColor",
        label: "Color de los Iconos (Corazón, Carrito, etc.)",
        type: "color",
      },
      {
        key: "iconHoverBg",
        label: "Color de Fondo Hover de los Iconos",
        type: "color",
      },
      {
        key: "searchIconColor",
        label: "Color del Icono de Búsqueda",
        type: "color",
      },
      {
        key: "searchBgColor",
        label: "Color de Fondo del Buscador",
        type: "color",
      },
      {
        key: "searchTextColor",
        label: "Color del Texto del Buscador",
        type: "color",
      },
      {
        key: "searchBorderColor",
        label: "Color del Borde del Buscador",
        type: "color",
      },
      {
        key: "linkColor",
        label: "Color de Enlaces de Navegación",
        type: "color",
      },
    ],
    defaults: {
      brandName: "Osoria",
      logoImage: "/logo-negro.svg",
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
      description:
        "Somos una pastelería artesanal dedicada a crear los más deliciosos pasteles, postres y dulces. Cada producto está hecho con ingredientes de la más alta calidad y mucho amor, para que puedas disfrutar de momentos especiales con cada bocado.",
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
      description:
        "Descubre la creatividad y el arte detrás de cada producto que preparamos con amor",
      images: [
        {
          src: "/reposteria/cupcakes-decorados.jpg",
          alt: "Cupcakes decorados con sprinkles en colores pastel - azul, amarillo y rosa",
          title: "Cupcakes Decorados",
          category: "Productos",
        },
        {
          src: "/reposteria/tarta-berries.jpg",
          alt: "Tarta de frutas con berries frescos, azúcar glass y menta",
          title: "Tarta de Berries",
          category: "Productos",
        },
        {
          src: "/reposteria/macarons-colores.jpg",
          alt: "Macarons en colores pastel - verde, rosa, amarillo y blanco",
          title: "Macarons Artesanales",
          category: "Productos",
        },
        {
          src: "/reposteria/mini-cakes-cheesecakes.jpg",
          alt: "Mini cakes y cheesecakes decorados con berries, chocolate y caramelo",
          title: "Mini Cakes y Cheesecakes",
          category: "Productos",
        },
        {
          src: "/reposteria/galletas-chocolate.jpg",
          alt: "Galletas de chocolate chip caseras",
          title: "Galletas de Chocolate",
          category: "Productos",
        },
        {
          src: "/reposteria/pastel-cumpleanos.jpg",
          alt: "Pastel de cumpleaños decorado con temática festiva y colorida",
          title: "Pasteles de Cumpleaños",
          category: "Productos",
        },
        {
          src: "/reposteria/pastel-boda.jpg",
          alt: "Pastel de boda estilo naked cake decorado con flores frescas",
          title: "Pasteles de Boda",
          category: "Productos",
        },
        {
          src: "/reposteria/herramientas-decoracion.jpg",
          alt: "Herramientas de decoración de pasteles - boquillas, pinceles y fondant",
          title: "Herramientas de Decoración",
          category: "Accesorios",
        },
        {
          src: "/reposteria/sprinkles-candies.jpg",
          alt: "Sprinkles y candies coloridos para decorar postres",
          title: "Sprinkles y Candies",
          category: "Decoraciones",
        },
        {
          src: "/reposteria/chocolates-truffles.jpg",
          alt: "Deliciosos chocolates y truffles artesanales",
          title: "Chocolates Artesanales",
          category: "Productos",
        },
        {
          src: "/reposteria/empaque-presentacion.jpg",
          alt: "Elementos de empaque y presentación para productos de repostería",
          title: "Empaque y Presentación",
          category: "Accesorios",
        },
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
      {
        key: "description",
        label: "Descripción de la Sección",
        type: "textarea",
      },
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
        ],
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
        ],
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
        ],
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
        ],
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
};

export function EditorPanel() {
  const {
    selectedComponent,
    selectComponent,
    selectedHeroLayer,
    setSelectedHeroLayer,
    selectedHeroSlideIndex,
    setSelectedHeroSlideIndex,
    selectedHeroHotspotId,
    setSelectedHeroHotspotId,
    componentEdits,
    updateComponentEdit,
    scheduleComponentEdit,
    flushScheduledEdits,
    clearComponentEdits,
    getComponentEditsSnapshot,
    isEditMode,
    toggleEditMode,
  } = useAdmin();
  const { styles: globalStyles, refreshStyles } = useStyles();
  const { store } = useStore();
  const [saving, setSaving] = useState(false);
  const [localValueOverrides, setLocalValueOverrides] = useState<
    Record<string, Record<string, any>>
  >({});
  const [activeTab, setActiveTab] = useState("content");

  // Verificar si estamos editando Hero desde un subdominio que no sea default
  const isEditingHeroFromSubdomain =
    selectedComponent === "hero" &&
    store?.subdomain &&
    store.subdomain !== "default";

  // Función para cerrar completamente el panel
  // Siempre cierra el modo de edición completamente, no solo deselecciona el componente
  const handleClosePanel = () => {
    toggleEditMode();
  };

  // No mostrar el panel si no está en modo edición (después de todos los hooks)
  if (!isEditMode) {
    return null;
  }

  if (!selectedComponent) {
    return (
      <div className="fixed right-0 top-0 h-screen w-full md:w-96 bg-background border-l border-border z-50 flex flex-col shadow-2xl">
        {/* Header con botón de cierre */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <h2 className="text-base md:text-lg font-semibold">
            Editor de Componentes
          </h2>
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
            <p className="text-xs md:text-sm mb-4">
              Haz clic en cualquier sección de la página para editarla
            </p>
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
    );
  }

  const config = COMPONENT_FIELDS[selectedComponent];
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
            <h2 className="text-base md:text-lg font-semibold">
              Componente no configurado
            </h2>
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
              <p className="text-xs md:text-sm">
                Este componente no tiene configuración de edición
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const componentLabel =
    selectedComponent.charAt(0).toUpperCase() + selectedComponent.slice(1);
  const currentStyles = globalStyles.get(selectedComponent) || {};
  const componentLocalOverrides = localValueOverrides[selectedComponent] || {};
  const componentEditValues = componentEdits.get(selectedComponent) || {};
  const baseLocalValues = {
    ...(config?.defaults || {}),
    ...currentStyles,
    ...componentLocalOverrides,
  };
  const effectiveLocalValues = {
    ...baseLocalValues,
    ...componentEditValues,
  };

  const handleInputChange = (key: string, value: any) => {
    // Actualizar estado local de forma optimista
    setLocalValueOverrides((prev) => {
      const currentOverrides = prev[selectedComponent] || {};
      if (currentOverrides[key] === value) {
        return prev;
      }
      return {
        ...prev,
        [selectedComponent]: {
          ...currentOverrides,
          [key]: value,
        },
      };
    });

    const isColorField =
      key === "bgColor" || key === "textColor" || key.includes("Color");

    if (isColorField) {
      scheduleComponentEdit(selectedComponent, key, value);
    } else {
      updateComponentEdit(selectedComponent, key, value);
    }
  };

  const handleArrayItemChange = (
    arrayKey: string,
    index: number,
    fieldKey: string,
    value: any,
  ) => {
    const currentArray = effectiveLocalValues[arrayKey] || [];
    const updatedArray = [...currentArray];
    updatedArray[index] = { ...updatedArray[index], [fieldKey]: value };
    handleInputChange(arrayKey, updatedArray);
  };

  const handleAddArrayItem = (arrayKey: string, arrayFields: any[]) => {
    const currentArray = effectiveLocalValues[arrayKey] || [];
    const newItem: Record<string, any> = {};
    arrayFields.forEach((field) => {
      newItem[field.key] = "";
    });
    handleInputChange(arrayKey, [...currentArray, newItem]);
  };

  const handleRemoveArrayItem = (arrayKey: string, index: number) => {
    const currentArray = effectiveLocalValues[arrayKey] || [];
    const updatedArray = currentArray.filter(
      (_: any, i: number) => i !== index,
    );
    handleInputChange(arrayKey, updatedArray);
  };

  const heroLayerModel =
    selectedComponent === "hero" ? toHeroLayerModel(effectiveLocalValues) : null;
  const activeHeroLayer: HeroLayerId = selectedHeroLayer ?? "background";
  const activeHeroSlideIndex = heroLayerModel
    ? Math.min(
        Math.max(selectedHeroSlideIndex ?? 0, 0),
        Math.max(heroLayerModel.products.length - 1, 0),
      )
    : 0;
  const activeHeroSlide = heroLayerModel?.products[activeHeroSlideIndex] ?? {};

  const handleHeroProductsChange = (
    products: NonNullable<typeof heroLayerModel>["products"],
  ) => {
    handleInputChange("products", products);
  };

  const handleHeroSlideChange = (
    fieldKey: string,
    value: string | HeroHotspot[],
    extraUpdates: Record<string, string | HeroHotspot[]> = {},
  ) => {
    if (!heroLayerModel) return;

    const updatedModel = updateHeroSlideLayer(heroLayerModel, activeHeroSlideIndex, {
      [fieldKey]: value,
      ...extraUpdates,
    });
    handleHeroProductsChange(updatedModel.products);
  };

  const handleAddHeroSlide = () => {
    if (!heroLayerModel) return;
    const nextSlideNumber = heroLayerModel.products.length + 1;
    const updatedProducts = [
      ...heroLayerModel.products,
      {
        label: "Nuevo",
        title: `Slide ${nextSlideNumber}`,
        subtitle: "",
        description: "",
        buttonText: "Comprar ahora",
        image: "",
        backgroundImage: "",
        textSize: "feature" as const,
        productPlacement: "right" as const,
        hotspots: [],
      },
    ];
    handleHeroProductsChange(updatedProducts);
    setSelectedHeroSlideIndex(updatedProducts.length - 1);
    setSelectedHeroHotspotId(null);
  };

  const handleDeleteHeroSlide = () => {
    if (!heroLayerModel || heroLayerModel.products.length <= 1) return;
    const updatedProducts = heroLayerModel.products.filter(
      (_slide, index) => index !== activeHeroSlideIndex,
    );
    handleHeroProductsChange(updatedProducts);
    setSelectedHeroSlideIndex(
      Math.min(activeHeroSlideIndex, Math.max(updatedProducts.length - 1, 0)),
    );
    setSelectedHeroHotspotId(null);
  };

  const handleAddHeroHotspot = () => {
    if (!activeHeroSlide.productImage) return;
    const activeHotspots = activeHeroSlide.hotspots ?? [];
    const nextHotspot: HeroHotspot = {
      id: createNextHeroHotspotId(activeHotspots),
      label: "Nuevo hotspot",
      description: "",
      href: "",
      anchor: "center-right",
    };
    const hotspots = [...activeHotspots, nextHotspot];
    handleHeroSlideChange("hotspots", hotspots);
    setSelectedHeroHotspotId(nextHotspot.id);
  };

  const handleHeroHotspotChange = (
    hotspotId: string,
    updates: Partial<HeroHotspot>,
  ) => {
    const hotspots = (activeHeroSlide.hotspots ?? []).map((hotspot) =>
      hotspot.id === hotspotId ? { ...hotspot, ...updates } : hotspot,
    );
    handleHeroSlideChange("hotspots", hotspots);
  };

  const handleDeleteHeroHotspot = (hotspotId: string) => {
    const hotspots = (activeHeroSlide.hotspots ?? []).filter(
      (hotspot) => hotspot.id !== hotspotId,
    );
    handleHeroSlideChange("hotspots", hotspots);
    if (selectedHeroHotspotId === hotspotId) {
      setSelectedHeroHotspotId(null);
    }
  };

  const renderHeroLayerControls = () => {
    if (!heroLayerModel) return null;

    if (activeHeroLayer === "background") {
      return (
        <div className="space-y-4">
          <ImageUpload
            value={activeHeroSlide.backgroundImage || activeHeroSlide.image || ""}
            onChange={(url) =>
              handleHeroSlideChange("backgroundImage", url, {
                image: activeHeroSlide.image || url,
              })
            }
            label="Imagen de fondo"
            context="hero-background-image"
          />
          <div className="space-y-2">
            <Label>Prominencia de imagen</Label>
            <Select
              value={heroLayerModel.imageFit}
              onValueChange={(value) => handleInputChange("imageFit", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Llenar el espacio</SelectItem>
                <SelectItem value="contain">Mostrar completa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Enfoque horizontal</Label>
            <Select
              value={heroLayerModel.imagePositionX}
              onValueChange={(value) =>
                handleInputChange("imagePositionX", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Enfoque vertical</Label>
            <Select
              value={heroLayerModel.imagePositionY}
              onValueChange={(value) =>
                handleInputChange("imagePositionY", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="top">Arriba</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="bottom">Abajo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    if (activeHeroLayer === "product") {
      const canUseSecondaryProduct =
        heroLayerModel.layoutMode === "full-image" &&
        heroLayerModel.contentAlign === "center";

      return (
        <div className="space-y-4">
          <ImageUpload
            value={activeHeroSlide.productImage || ""}
            onChange={(url) => handleHeroSlideChange("productImage", url)}
            label="Imagen PNG del producto"
            context="hero-product-image"
          />
          <div className="space-y-2">
            <Label htmlFor="hero-product-alt">Texto alternativo del producto</Label>
            <Input
              id="hero-product-alt"
              value={activeHeroSlide.productAlt || ""}
              onChange={(event) =>
                handleHeroSlideChange("productAlt", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-product-placement">Ubicación del producto</Label>
            <Select
              value={activeHeroSlide.productPlacement ?? "right"}
              onValueChange={(value) =>
                handleHeroSlideChange("productPlacement", value)
              }
            >
              <SelectTrigger id="hero-product-placement" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HERO_PRODUCT_PLACEMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 rounded-lg border border-border p-3">
            <div>
              <h4 className="text-sm font-semibold">
                Producto secundario opcional
              </h4>
              <p className="text-xs text-muted-foreground">
                Un solo producto adicional, ubicado con composiciones nombradas.
              </p>
            </div>
            {canUseSecondaryProduct ? (
              <>
                <ImageUpload
                  value={activeHeroSlide.secondaryProductImage || ""}
                  onChange={(url) =>
                    handleHeroSlideChange("secondaryProductImage", url)
                  }
                  label="Imagen secundaria del producto"
                  context="hero-secondary-product-image"
                />
                <div className="space-y-2">
                  <Label htmlFor="hero-secondary-product-alt">
                    Texto alternativo del producto secundario
                  </Label>
                  <Input
                    id="hero-secondary-product-alt"
                    value={activeHeroSlide.secondaryProductAlt || ""}
                    onChange={(event) =>
                      handleHeroSlideChange(
                        "secondaryProductAlt",
                        event.target.value,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hero-secondary-product-preset">
                    Composición secundaria
                  </Label>
                  <Select
                    value={
                      activeHeroSlide.secondaryProductPreset ??
                      "primary-right-secondary-left"
                    }
                    onValueChange={(value) =>
                      handleHeroSlideChange("secondaryProductPreset", value)
                    }
                  >
                    <SelectTrigger
                      id="hero-secondary-product-preset"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HERO_SECONDARY_PRODUCT_PRESET_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  El producto secundario está disponible solo en Full Image con
                  mensaje centrado.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      );
    }

    if (activeHeroLayer === "content") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-label">Etiqueta</Label>
            <Input
              id="hero-label"
              value={activeHeroSlide.label || ""}
              onChange={(event) =>
                handleHeroSlideChange("label", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-title">Título</Label>
            <Input
              id="hero-title"
              value={activeHeroSlide.title || ""}
              onChange={(event) =>
                handleHeroSlideChange("title", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-subtitle">Subtítulo</Label>
            <Input
              id="hero-subtitle"
              value={activeHeroSlide.subtitle || ""}
              onChange={(event) =>
                handleHeroSlideChange("subtitle", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-description">Mensaje</Label>
            <Textarea
              id="hero-description"
              value={activeHeroSlide.description || ""}
              onChange={(event) =>
                handleHeroSlideChange("description", event.target.value)
              }
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Alineación del mensaje</Label>
            <Select
              value={heroLayerModel.contentAlign}
              onValueChange={(value) =>
                handleInputChange("fullImageContentAlign", value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Izquierda</SelectItem>
                <SelectItem value="center">Centro</SelectItem>
                <SelectItem value="right">Derecha</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-slide-text-color">Color de texto del slide</Label>
            <Input
              id="hero-slide-text-color"
              type="color"
              value={activeHeroSlide.textColor || effectiveLocalValues.textColor || "#ffffff"}
              onChange={(event) =>
                handleHeroSlideChange("textColor", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-slide-text-size">Tamaño de texto</Label>
            <Select
              value={activeHeroSlide.textSize ?? "feature"}
              onValueChange={(value) => handleHeroSlideChange("textSize", value)}
            >
              <SelectTrigger id="hero-slide-text-size" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HERO_TEXT_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    if (activeHeroLayer === "overlay") {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hero-overlay-color">Contraste</Label>
            <Input
              id="hero-overlay-color"
              type="color"
              value={heroLayerModel.overlayColor}
              onChange={(event) =>
                handleInputChange("overlayColor", event.target.value)
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-overlay-opacity">Intensidad</Label>
            <Input
              id="hero-overlay-opacity"
              type="number"
              min="0"
              max="0.9"
              step="0.05"
              value={heroLayerModel.overlayOpacity}
              onChange={(event) =>
                handleInputChange("overlayOpacity", event.target.value)
              }
            />
          </div>
        </div>
      );
    }

    if (activeHeroLayer === "hotspots") {
      const canEditHotspots = Boolean(activeHeroSlide.productImage);
      const hotspots = activeHeroSlide.hotspots ?? [];
      const editableHotspot =
        hotspots.find((hotspot) => hotspot.id === selectedHeroHotspotId) ??
        hotspots[0];

      return (
        <div className="space-y-4">
          {!canEditHotspots && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Para ubicar hotspots necesitás una imagen de producto en este
                slide.
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={handleAddHeroHotspot}
            disabled={!canEditHotspots}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar hotspot
          </Button>

          {canEditHotspots && hotspots.length > 0 && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="hero-hotspot-active">Hotspot activo</Label>
                <Select
                  value={editableHotspot?.id}
                  onValueChange={(value) => setSelectedHeroHotspotId(value)}
                >
                  <SelectTrigger id="hero-hotspot-active" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hotspots.map((hotspot, index) => (
                      <SelectItem key={hotspot.id} value={hotspot.id}>
                        {hotspot.label || `Hotspot ${index + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {editableHotspot && (
                <div className="space-y-3 rounded-lg border border-border p-3">
                  <div className="space-y-2">
                    <Label htmlFor="hero-hotspot-label">Etiqueta del hotspot</Label>
                    <Input
                      id="hero-hotspot-label"
                      value={editableHotspot.label}
                      onChange={(event) =>
                        handleHeroHotspotChange(editableHotspot.id, {
                          label: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero-hotspot-description">Detalle</Label>
                    <Textarea
                      id="hero-hotspot-description"
                      value={editableHotspot.description || ""}
                      onChange={(event) =>
                        handleHeroHotspotChange(editableHotspot.id, {
                          description: event.target.value,
                        })
                      }
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero-hotspot-link">Link opcional</Label>
                    <Input
                      id="hero-hotspot-link"
                      value={editableHotspot.href || ""}
                      onChange={(event) =>
                        handleHeroHotspotChange(editableHotspot.id, {
                          href: event.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hero-hotspot-anchor">Ubicación del hotspot</Label>
                    <Select
                      value={editableHotspot.anchor}
                      onValueChange={(value) =>
                        handleHeroHotspotChange(editableHotspot.id, {
                          anchor: value as HeroHotspot["anchor"],
                        })
                      }
                    >
                      <SelectTrigger id="hero-hotspot-anchor" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HERO_HOTSPOT_ANCHOR_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDeleteHeroHotspot(editableHotspot.id)}
                    className="w-full text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar hotspot
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="hero-cta-text">Texto de la acción</Label>
          <Input
            id="hero-cta-text"
            value={activeHeroSlide.buttonText || ""}
            onChange={(event) =>
              handleHeroSlideChange("buttonText", event.target.value)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero-button-color">Color de acción</Label>
          <Input
            id="hero-button-color"
            type="color"
            value={
              effectiveLocalValues.buttonColor ||
              config.defaults?.buttonColor ||
              "#005aa1"
            }
            onChange={(event) =>
              handleInputChange("buttonColor", event.target.value)
            }
          />
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const edits = getComponentEditsSnapshot(selectedComponent);
      flushScheduledEdits(selectedComponent);

      if (Object.keys(edits).length === 0) {
        toast.info("No hay cambios para guardar");
        setSaving(false);
        return;
      }

      console.log("[Editor] Guardando cambios para", selectedComponent, edits);

      // Obtener estilos actuales de la BD
      const currentStyles = globalStyles.get(selectedComponent) || {};

      // Combinar estilos actuales con las ediciones
      // Los edits tienen prioridad sobre los estilos actuales
      const mergedStyles = {
        ...currentStyles,
        ...edits,
      };

      console.log("[Editor] Estilos combinados a guardar:", mergedStyles);
      console.log("[Editor] Campos a guardar:", Object.keys(mergedStyles));

      // Guardar en Supabase
      const result = await updateComponentStyle(
        selectedComponent,
        mergedStyles,
      );

      console.log("[Editor] Resultado del guardado:", result);

      // Refrescar estilos desde Supabase para asegurar sincronización
      await refreshStyles();

      // Actualizar localStorage inmediatamente (con store_id)
      try {
        // Para Hero, siempre usar el store_id del store por defecto
        let storeId: string | null = null;
        if (selectedComponent === "hero") {
          // Obtener el store_id del store por defecto desde Supabase
          const supabase = (
            await import("@/lib/supabase/client")
          ).getSupabaseEcommerce();
          if (supabase) {
            const { ECOMMERCE_VIEWS } = await import(
              "@/lib/supabase/contract"
            );
            const { data: defaultStore } = await supabase
              .from(ECOMMERCE_VIEWS.storesLegacy)
              .select("id")
              .eq("subdomain", "default")
              .single();

            if (defaultStore?.id) {
              storeId = defaultStore.id;
            }
          }
        } else {
          // Para otros componentes, usar el store_id actual
          storeId = await getStoreId();
        }

        if (storeId) {
          const storageKey = `osoria_component_styles_${storeId}`;
          const savedStyles = localStorage.getItem(storageKey);
          const styles = savedStyles ? JSON.parse(savedStyles) : {};
          styles[selectedComponent] = mergedStyles;
          localStorage.setItem(storageKey, JSON.stringify(styles));
          // Solo actualizar osoria_current_store_id si no es Hero
          if (selectedComponent !== "hero") {
            localStorage.setItem("osoria_current_store_id", storeId);
          }
        }

        // Aplicar estilos inmediatamente al DOM
        if (typeof document !== "undefined") {
          const root = document.documentElement;
          Object.keys(mergedStyles).forEach((key) => {
            if (
              key === "bgColor" ||
              key === "textColor" ||
              key.includes("Color")
            ) {
              const cssVar = `--${selectedComponent}-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
              root.style.setProperty(cssVar, mergedStyles[key]);

              // También aplicar directamente al componente
              const componentElement = document.querySelector(
                `[data-component="${selectedComponent}"]`,
              );
              if (componentElement) {
                if (key === "bgColor") {
                  (componentElement as HTMLElement).style.backgroundColor =
                    mergedStyles[key];
                } else if (key === "textColor") {
                  (componentElement as HTMLElement).style.color =
                    mergedStyles[key];
                }
              }
            }
          });
        }
      } catch (e) {
        console.warn("[Editor] Error saving to localStorage:", e);
      }

      toast.success("Cambios guardados correctamente");
      clearComponentEdits(selectedComponent);

      setLocalValueOverrides((prev) => {
        const next = { ...prev };
        delete next[selectedComponent];
        return next;
      });
    } catch (error) {
      toast.error("Error al guardar los cambios");
      console.error("[Editor] Error completo:", error);
      if (error instanceof Error) {
        console.error("[Editor] Mensaje:", error.message);
        console.error("[Editor] Stack:", error.stack);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setLocalValueOverrides((prev) => {
      const next = { ...prev };
      delete next[selectedComponent];
      return next;
    });
    clearComponentEdits(selectedComponent);
    toast.info("Cambios descartados");
  };

  const hasChanges = componentEdits.has(selectedComponent);

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
        className="fixed right-0 top-0 h-screen w-full md:w-96 bg-background text-foreground border-l border-border z-50 flex flex-col shadow-2xl font-sans"
        data-editor-panel={selectedComponent ? "open" : "closed"}
        data-admin-neutral="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div className="text-base md:text-lg font-semibold tracking-normal leading-tight">
            Editando: {componentLabel}
          </div>
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

        {/* Mensaje informativo para Hero en subdominios */}
        {isEditingHeroFromSubdomain && (
          <div className="p-4 border-b border-border">
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                El componente Hero solo se puede editar en la página por
                defecto. Los cambios se guardarán para la tienda principal, no
                para este subdominio ({store?.subdomain}).
              </AlertDescription>
            </Alert>
          </div>
        )}

        {selectedComponent === "hero" ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0 custom-scrollbar">
            <div className="space-y-2">
              <h3 className="text-base font-semibold">Editor del Hero</h3>
              <p className="text-sm text-muted-foreground">
                Primero definí el banner, después elegí el slide y por último
                ajustá el componente actual con controles simples.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-layout-mode">Tipo de banner</Label>
              <Select
                value={heroLayerModel?.layoutMode ?? "split"}
                onValueChange={(value) => handleInputChange("layoutMode", value)}
              >
                <SelectTrigger id="hero-layout-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">Split</SelectItem>
                  <SelectItem value="full-image">Full Image</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold">Gestión de slides</h4>
                  <p className="text-xs text-muted-foreground">
                    Cada slide se guarda dentro de products[].
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddHeroSlide}
                    aria-label="Agregar slide"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteHeroSlide}
                    disabled={(heroLayerModel?.products.length ?? 0) <= 1}
                    aria-label="Eliminar slide"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-slide-select">Slide activo</Label>
                <Select
                  value={String(activeHeroSlideIndex)}
                  onValueChange={(value) => {
                    setSelectedHeroSlideIndex(Number(value));
                    setSelectedHeroHotspotId(null);
                  }}
                >
                  <SelectTrigger id="hero-slide-select" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(heroLayerModel?.products ?? []).map((slide, index) => (
                      <SelectItem key={index} value={String(index)}>
                        {`Slide ${index + 1} - ${slide.title || slide.label || "sin título"}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hero-layer-select">Componente del slide</Label>
              <Select
                value={activeHeroLayer}
                onValueChange={(value) => setSelectedHeroLayer(value as HeroLayerId)}
              >
                <SelectTrigger id="hero-layer-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HERO_LAYER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              {renderHeroLayerControls()}
            </div>
          </div>
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col min-h-0"
          >
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
          <TabsContent
            value="content"
            className="flex-1 overflow-y-auto p-4 space-y-4 mt-0 min-h-0 custom-scrollbar"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Contenido del Componente
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Organizá el mensaje, los slides y el tipo de banner que va a
                  ver el cliente.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.content.map((field) => {
                    const layoutModeValue =
                      effectiveLocalValues.layoutMode ??
                      config.defaults?.layoutMode;
                  const isHeroFullImageControl =
                    selectedComponent === "hero" &&
                    [
                      "imageFit",
                      "imagePositionX",
                      "imagePositionY",
                      "fullImageContentAlign",
                    ].includes(field.key);

                  if (
                    isHeroFullImageControl &&
                    layoutModeValue !== "full-image"
                  ) {
                    return null;
                  }

                  return (
                    <div key={field.key} className="space-y-2">
                      {field.isArray ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between mb-2 sticky top-0 bg-background z-10 py-2 -mx-2 px-2 border-b border-border">
                            <Label className="font-semibold">
                              {field.label}
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleAddArrayItem(
                                  field.key,
                                  field.arrayFields || [],
                                )
                              }
                              className="h-8"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Agregar
                            </Button>
                          </div>
                          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {(effectiveLocalValues[field.key] || []).map(
                              (item: any, index: number) => (
                                <Card key={index} className="mb-3">
                                  <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                      <CardTitle className="text-sm">
                                        Item {index + 1}
                                      </CardTitle>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleRemoveArrayItem(
                                            field.key,
                                            index,
                                          )
                                        }
                                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    {field.arrayFields?.map((subField) => (
                                      <div
                                        key={subField.key}
                                        className="space-y-1"
                                      >
                                        {subField.type === "image" ||
                                        subField.key
                                          .toLowerCase()
                                          .includes("image") ? (
                                          <ImageUpload
                                            value={item[subField.key] || ""}
                                            onChange={(url) =>
                                              handleArrayItemChange(
                                                field.key,
                                                index,
                                                subField.key,
                                                url,
                                              )
                                            }
                                            label={subField.label}
                                            context={`${selectedComponent}-${field.key}-${subField.key}-${index + 1}`}
                                          />
                                        ) : subField.type === "textarea" ? (
                                          <>
                                            <Label className="text-xs">
                                              {subField.label}
                                            </Label>
                                            <Textarea
                                              value={item[subField.key] || ""}
                                              onChange={(e) =>
                                                handleArrayItemChange(
                                                  field.key,
                                                  index,
                                                  subField.key,
                                                  e.target.value,
                                                )
                                              }
                                              rows={2}
                                            />
                                          </>
                                        ) : (
                                          <>
                                            <Label className="text-xs">
                                              {subField.label}
                                            </Label>
                                            <Input
                                              type={subField.type}
                                              value={item[subField.key] || ""}
                                              onChange={(e) => {
                                                const value =
                                                  subField.type === "number"
                                                    ? Number(e.target.value)
                                                    : e.target.value;
                                                handleArrayItemChange(
                                                  field.key,
                                                  index,
                                                  subField.key,
                                                  value,
                                                );
                                              }}
                                            />
                                          </>
                                        )}
                                      </div>
                                    ))}
                                  </CardContent>
                                </Card>
                              ),
                            )}
                          </div>
                          {(!effectiveLocalValues[field.key] ||
                            effectiveLocalValues[field.key].length === 0) && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              No hay items. Usá Agregar para crear uno nuevo.
                            </div>
                          )}
                        </div>
                      ) : field.type === "select" && field.options ? (
                        <>
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <Select
                            value={
                              effectiveLocalValues[field.key] ||
                              config.defaults?.[field.key]
                            }
                            onValueChange={(value) =>
                              handleInputChange(field.key, value)
                            }
                          >
                            <SelectTrigger id={field.key} className="w-full">
                              <SelectValue
                                placeholder={`Selecciona ${field.label.toLowerCase()}`}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : field.type === "image" ||
                        field.key.toLowerCase().includes("image") ? (
                        <ImageUpload
                          value={effectiveLocalValues[field.key] || ""}
                          onChange={(url) => handleInputChange(field.key, url)}
                          label={field.label}
                          context={`${selectedComponent}-${field.key}`}
                          // Configuración específica para logos
                          recommendedWidth={
                            field.key.toLowerCase().includes("logo")
                              ? 240
                              : undefined
                          }
                          recommendedHeight={
                            field.key.toLowerCase().includes("logo")
                              ? 80
                              : undefined
                          }
                          fileTypes={
                            field.key.toLowerCase().includes("logo")
                              ? ["PNG", "SVG", "JPG", "WEBP"]
                              : undefined
                          }
                          accept={
                            field.key.toLowerCase().includes("logo")
                              ? "image/png,image/svg+xml,image/jpeg,image/jpg,image/webp"
                              : undefined
                          }
                        />
                      ) : field.type === "textarea" ? (
                        <>
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <Textarea
                            id={field.key}
                            value={effectiveLocalValues[field.key] || ""}
                            onChange={(e) =>
                              handleInputChange(field.key, e.target.value)
                            }
                            rows={3}
                          />
                        </>
                      ) : (
                        <>
                          <Label htmlFor={field.key}>{field.label}</Label>
                          <Input
                            id={field.key}
                            type={field.type}
                            value={effectiveLocalValues[field.key] || ""}
                            onChange={(e) =>
                              handleInputChange(field.key, e.target.value)
                            }
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Styles Tab */}
          <TabsContent
            value="styles"
            className="flex-1 overflow-y-auto p-4 space-y-4 mt-0 min-h-0 custom-scrollbar"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Estilos del Componente
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Ajustá colores y acabados. Los selectores de color se aplican
                  en vivo sin disparar el guardado en cada arrastre.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {config.styles && config.styles.length > 0 ? (
                  config.styles.map((field) => {
                    const currentValue = effectiveLocalValues[field.key] || "";
                    const defaultValue = config.defaults?.[field.key] || "";
                    const displayValue = currentValue || defaultValue || "";

                    // Mostrar/ocultar campos según el tipo de fondo seleccionado
                    if (selectedComponent === "site_background") {
                      if (
                        field.key === "backgroundColor" &&
                        effectiveLocalValues.type === "image"
                      ) {
                        return null; // Ocultar color si es imagen
                      }
                      if (
                        field.key === "backgroundImage" &&
                        effectiveLocalValues.type === "color"
                      ) {
                        return null; // Ocultar imagen si es color
                      }
                      if (
                        field.key === "backgroundPosition" ||
                        field.key === "backgroundRepeat" ||
                        field.key === "backgroundSize"
                      ) {
                        if (effectiveLocalValues.type === "color") {
                          return null; // Ocultar opciones de imagen si es color
                        }
                      }
                    }

                    return (
                      <div key={field.key} className="space-y-2">
                        <Label
                          htmlFor={`style-${field.key}`}
                          className="text-sm font-medium"
                        >
                          {field.label}
                        </Label>
                        {field.type === "select" && field.options ? (
                          <Select
                            value={currentValue || defaultValue}
                            onValueChange={(value) =>
                              handleInputChange(field.key, value)
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={`Selecciona ${field.label.toLowerCase()}`}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === "image" ||
                          field.key.toLowerCase().includes("image") ? (
                          <ImageUpload
                            value={currentValue || ""}
                            onChange={(url) =>
                              handleInputChange(field.key, url)
                            }
                            label={field.label}
                            context={`${selectedComponent}-${field.key}`}
                          />
                        ) : field.type === "checkbox" ? (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`style-${field.key}`}
                              checked={
                                currentValue === "true" ||
                                currentValue === true ||
                                currentValue === "1"
                              }
                              onCheckedChange={(checked: boolean) =>
                                handleInputChange(
                                  field.key,
                                  checked ? "true" : "false",
                                )
                              }
                            />
                            <Label
                              htmlFor={`style-${field.key}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {field.label}
                            </Label>
                          </div>
                        ) : (
                          <div className="flex gap-2 items-center">
                            <Input
                              id={`style-${field.key}`}
                              type={field.type}
                              value={currentValue}
                              onChange={(e) =>
                                handleInputChange(field.key, e.target.value)
                              }
                              className={
                                field.type === "color"
                                  ? "h-10 flex-1"
                                  : "flex-1"
                              }
                              placeholder={
                                field.type === "color"
                                  ? "#000000"
                                  : defaultValue || "Ingrese un valor..."
                              }
                            />
                            {field.type === "color" && (
                              <div
                                className="w-12 h-12 rounded border-2 border-border cursor-pointer hover:scale-105 transition-transform flex-shrink-0"
                                style={{
                                  backgroundColor: displayValue || "#000000",
                                }}
                                onClick={() => {
                                  const input = document.getElementById(
                                    `style-${field.key}`,
                                  ) as HTMLInputElement;
                                  if (input) input.click();
                                }}
                                title="Haz clic para abrir el selector de color"
                              />
                            )}
                          </div>
                        )}
                        {displayValue && field.type !== "select" && (
                          <p className="text-xs text-muted-foreground">
                            Valor:{" "}
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                              {displayValue}
                            </code>
                          </p>
                        )}
                      </div>
                    );
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
        )}

        {/* Actions */}
        <div className="p-4 border-t border-border space-y-2 flex-shrink-0">
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
          <Button
            variant="outline"
            className="w-full bg-transparent"
            onClick={handleReset}
            disabled={!hasChanges}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Descartar Cambios
          </Button>
        </div>
      </div>
    </>
  );
}
