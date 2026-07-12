// Static registry of editable content/style fields per section component.
// Pure data, no admin-context dependency: consumed by the theme customizer.

import {
  DEFAULT_HERO_LAYER_MODEL,
  DEFAULT_HERO_PRODUCTS,
} from "@/lib/hero/hero-layer-model";
import { SPECIAL_OFFER_DEFAULTS } from "@/components/sections/special-offer";
import { NEWSLETTER_DEFAULTS } from "@/components/sections/newsletter-section";
import { HEADER_DEFAULTS } from "@/components/layout/header";
import { HEADER_LAYOUT_VARIANT_OPTIONS } from "@/lib/header/header-layout-variant";
import { HEADER_STICKY_MODE_OPTIONS } from "@/lib/header/header-sticky-mode";
import { FEATURED_DEFAULTS } from "@/components/sections/featured-product";
import { POPULAR_DEFAULTS } from "@/components/sections/popular-items";
import { PRODUCTS_DEFAULTS } from "@/components/sections/products-grid";
import { WHYUS_DEFAULTS, type WhyUsIconKey } from "@/components/sections/why-us";
import { TESTIMONIALS_DEFAULTS } from "@/components/sections/testimonials";
import { LOGOS_DEFAULTS } from "@/components/sections/logos";
import { FAQ_DEFAULTS } from "@/components/sections/faq";
import { VIDEO_DEFAULTS } from "@/components/sections/video";
import { STORY_DEFAULTS } from "@/components/sections/story";
import { INSTAGRAM_DEFAULTS } from "@/components/sections/instagram";
import { REPOSTERIA_GALLERY_DEFAULTS } from "@/components/sections/reposteria-gallery";
import {
  PRODUCTS_CARD_STYLE_OPTIONS,
  PRODUCTS_COLUMNS_OPTIONS,
  PRODUCTS_HOVER_EFFECT_OPTIONS,
} from "@/lib/sections/products-variant";
import {
  POPULAR_COLUMNS_OPTIONS,
  POPULAR_GRID_LAYOUT_OPTIONS,
  POPULAR_TEXT_PLACEMENT_OPTIONS,
  POPULAR_TILE_ASPECT_OPTIONS,
} from "@/lib/sections/popular-variant";
import {
  FEATURED_IMAGE_SIDE_OPTIONS,
  FEATURED_CONTENT_WIDTH_OPTIONS,
  FEATURED_TEXT_ALIGN_OPTIONS,
  FEATURED_SECTION_HEIGHT_OPTIONS,
  FEATURED_BACKGROUND_MODE_OPTIONS,
  FEATURED_CONTENT_ALIGN_OPTIONS,
  FEATURED_CTA_STYLE_OPTIONS,
} from "@/lib/sections/featured-variant";
import { HERO_SECTION_HEIGHT_OPTIONS } from "@/lib/sections/hero-variant";
import { SPECIAL_OFFER_IMAGE_SIDE_OPTIONS } from "@/lib/sections/special-offer-variant";
import {
  NEWSLETTER_CONTENT_ALIGN_OPTIONS,
  NEWSLETTER_LAYOUT_OPTIONS,
} from "@/lib/sections/newsletter-variant";
import {
  WHYUS_COLUMNS_OPTIONS,
  WHYUS_CONTENT_ALIGN_OPTIONS,
  WHYUS_ICON_POSITION_OPTIONS,
  WHYUS_ICON_STYLE_OPTIONS,
  WHYUS_LAYOUT_FORMAT_OPTIONS,
} from "@/lib/sections/whyus-variant";
import {
  TESTIMONIALS_CARD_STYLE_OPTIONS,
  TESTIMONIALS_COLUMNS_OPTIONS,
  TESTIMONIALS_CONTENT_ALIGN_OPTIONS,
} from "@/lib/sections/testimonials-variant";
import {
  LOGOS_ALIGN_OPTIONS,
  LOGOS_COLUMNS_OPTIONS,
  LOGOS_SIZE_OPTIONS,
} from "@/lib/sections/logos-variant";
import {
  FAQ_COLUMNS_OPTIONS,
  FAQ_ITEM_STYLE_OPTIONS,
} from "@/lib/sections/faq-variant";
import { VIDEO_ASPECT_RATIO_OPTIONS } from "@/lib/sections/video-variant";
import {
  STORY_CONTENT_ALIGN_OPTIONS,
  STORY_IMAGE_POSITION_OPTIONS,
} from "@/lib/sections/story-variant";
import {
  INSTAGRAM_COLUMNS_OPTIONS,
  INSTAGRAM_GAP_OPTIONS,
} from "@/lib/sections/instagram-variant";
import type { SectionFieldsConfig } from "./types";

const WHYUS_ICON_OPTIONS: Array<{ value: WhyUsIconKey; label: string }> = [
  { value: "support", label: "Soporte" },
  { value: "shipping", label: "Envío" },
  { value: "payment", label: "Pago" },
  { value: "discount", label: "Descuento" },
  { value: "warranty", label: "Garantía" },
  { value: "returns", label: "Devoluciones" },
  { value: "security", label: "Seguridad" },
  { value: "chat", label: "Chat" },
  { value: "fast", label: "Rápido" },
  { value: "quality", label: "Calidad" },
  { value: "gift", label: "Regalo" },
  { value: "stock", label: "Stock" },
  { value: "delivery", label: "Entrega" },
  { value: "phone", label: "Teléfono" },
  { value: "favorite", label: "Favorito" },
  { value: "star", label: "Estrella" },
];

export const COMPONENT_FIELDS: Record<string, SectionFieldsConfig> = {
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
      {
        key: "sectionHeight",
        label: "Alto de sección",
        type: "select",
        options: [...HERO_SECTION_HEIGHT_OPTIONS],
        group: "design",
      },
      {
        key: "autoplay",
        label: "Autoplay del carrusel",
        type: "toggle",
        group: "design",
      },
      {
        key: "autoplayInterval",
        label: "Intervalo (segundos)",
        type: "number",
        group: "design",
      },
      {
        key: "showBottomBar",
        label: "Mostrar barra inferior",
        type: "toggle",
        group: "design",
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
      layoutMode: DEFAULT_HERO_LAYER_MODEL.layoutMode,
      imageFit: DEFAULT_HERO_LAYER_MODEL.imageFit,
      backgroundMode: DEFAULT_HERO_LAYER_MODEL.backgroundMode,
      imagePositionX: DEFAULT_HERO_LAYER_MODEL.imagePositionX,
      imagePositionY: DEFAULT_HERO_LAYER_MODEL.imagePositionY,
      fullImageContentAlign: DEFAULT_HERO_LAYER_MODEL.contentAlign,
      products: DEFAULT_HERO_PRODUCTS,
      bgColor: "#4a5568",
      textColor: "#ffffff",
      buttonColor: "#005aa1",
      buttonTextColor: "#ffffff",
      barColor: "#005aa1",
      overlayColor: DEFAULT_HERO_LAYER_MODEL.overlayColor,
      overlayOpacity: String(DEFAULT_HERO_LAYER_MODEL.overlayOpacity),
      sectionHeight: "standard",
      autoplay: true,
      autoplayInterval: 10,
      showBottomBar: true,
    },
  },
  popular: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      { key: "priceLabel", label: "Etiqueta de Precio (encabezado)", type: "text" },
      {
        key: "columns",
        label: "Columnas",
        type: "select",
        options: [...POPULAR_COLUMNS_OPTIONS],
        group: "design",
      },
      {
        key: "tileAspect",
        label: "Aspecto del tile",
        type: "select",
        options: [...POPULAR_TILE_ASPECT_OPTIONS],
        group: "design",
      },
      {
        key: "textPlacement",
        label: "Posición del texto",
        type: "select",
        options: [...POPULAR_TEXT_PLACEMENT_OPTIONS],
        group: "design",
      },
      {
        key: "showStartingPrice",
        label: "Mostrar etiqueta 'Desde $X'",
        type: "toggle",
        group: "design",
      },
      {
        key: "gridLayout",
        label: "Layout de la grilla",
        type: "select",
        options: [...POPULAR_GRID_LAYOUT_OPTIONS],
        group: "design",
      },
      {
        key: "categoryTiles",
        label: "Categorías destacadas (vacío = automático, las primeras del catálogo)",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "categoryId", label: "Categoría", type: "category" },
          { key: "imageUrl", label: "Imagen del tile (opcional)", type: "image" },
        ],
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
      { key: "buttonColor", label: "Color del Botón", type: "color" },
    ],
    defaults: POPULAR_DEFAULTS,
  },
  products: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      { key: "eyebrow", label: "Texto Superior (categoría destacada)", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      {
        key: "selectionMode",
        label: "Modo de Selección",
        type: "select",
        options: [
          { value: "display_order", label: "Orden de exhibición" },
          { value: "best_selling", label: "Más vendidos" },
          { value: "most_viewed", label: "Más vistos" },
          { value: "featured", label: "Destacados" },
        ],
      },
      {
        key: "itemCount",
        label: "Cantidad de productos",
        type: "select",
        options: [
          { value: "4", label: "4" },
          { value: "6", label: "6" },
          { value: "8", label: "8" },
          { value: "12", label: "12" },
        ],
      },
      {
        key: "columns",
        label: "Columnas",
        type: "select",
        options: [...PRODUCTS_COLUMNS_OPTIONS],
        group: "design",
      },
      {
        key: "mediaPosition",
        label: "Posición de imagen",
        type: "select",
        options: [
          { value: "top", label: "Arriba" },
          { value: "bottom", label: "Abajo" },
        ],
        group: "design",
      },
      {
        key: "cardStyle",
        label: "Estilo de tarjeta",
        type: "select",
        options: [...PRODUCTS_CARD_STYLE_OPTIONS],
        group: "design",
      },
      {
        key: "hoverEffect",
        label: "Efecto al pasar el mouse",
        type: "select",
        options: [...PRODUCTS_HOVER_EFFECT_OPTIONS],
        group: "design",
      },
      { key: "showCategory", label: "Mostrar Categoría", type: "toggle", group: "design" },
      { key: "showPrice", label: "Mostrar Precio", type: "toggle", group: "design" },
      { key: "showDescription", label: "Mostrar descripción", type: "toggle", group: "design" },
      { key: "showCta", label: "Mostrar botón", type: "toggle", group: "design" },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
      { key: "cardBgColor", label: "Color de Fondo de la Tarjeta", type: "color" },
      { key: "priceColor", label: "Color del Precio", type: "color" },
      {
        key: "cornerRadius",
        label: "Radio de Esquina",
        type: "select",
        options: [
          { value: "none", label: "Ninguno" },
          { value: "md", label: "Mediano" },
          { value: "lg", label: "Grande" },
          { value: "xl", label: "Extra" },
        ],
      },
    ],
    defaults: PRODUCTS_DEFAULTS,
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
        key: "productId",
        label: "Producto (elegir del catálogo)",
        type: "product",
      },
      {
        key: "imageSide",
        label: "Lado de la imagen",
        type: "select",
        options: [...FEATURED_IMAGE_SIDE_OPTIONS],
        group: "design",
      },
      {
        key: "contentWidth",
        label: "Proporción imagen / contenido",
        type: "select",
        options: [...FEATURED_CONTENT_WIDTH_OPTIONS],
        group: "design",
      },
      {
        key: "textAlign",
        label: "Alineación del texto",
        type: "select",
        options: [...FEATURED_TEXT_ALIGN_OPTIONS],
        group: "design",
      },
      {
        key: "sectionHeight",
        label: "Alto de la sección",
        type: "select",
        options: [...FEATURED_SECTION_HEIGHT_OPTIONS],
        group: "design",
      },
      {
        key: "backgroundMode",
        label: "Modo de fondo",
        type: "select",
        options: [...FEATURED_BACKGROUND_MODE_OPTIONS],
        group: "design",
      },
      {
        key: "contentAlign",
        label: "Posición del contenido (modo color / imagen de fondo)",
        type: "select",
        options: [...FEATURED_CONTENT_ALIGN_OPTIONS],
        group: "design",
      },
      {
        key: "ctaStyle",
        label: "Estilo del botón",
        type: "select",
        options: [...FEATURED_CTA_STYLE_OPTIONS],
        group: "design",
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo", type: "color" },
      { key: "textColor", label: "Color de Texto", type: "color" },
      { key: "cardBgColor", label: "Color de Fondo de la Tarjeta", type: "color" },
      {
        key: "productBgColor",
        label: "Color de Fondo del Producto (Cuadro pequeño)",
        type: "color",
      },
      { key: "overlayColor", label: "Color de Superposición (imagen de fondo)", type: "color" },
      {
        key: "overlayOpacity",
        label: "Opacidad de Superposición (0-1)",
        type: "number",
      },
    ],
    defaults: FEATURED_DEFAULTS,
  },
  specialOffer: {
    content: [
      {
        key: "productId",
        label: "Producto (elegir del catálogo)",
        type: "product",
      },
      {
        key: "endDate",
        label: "Fecha límite de la oferta",
        type: "datetime",
      },
      {
        key: "showcaseImage",
        label: "Imagen de la oferta (opcional, reemplaza la del producto)",
        type: "image",
      },
      { key: "title", label: "Título Principal", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "claimedPercent", label: "Porcentaje Reclamado", type: "number" },
      { key: "countdownLabel", label: "Etiqueta de Cuenta Regresiva", type: "text" },
      { key: "linkText", label: "Texto del Botón", type: "text" },
      {
        key: "imageSide",
        label: "Lado de la imagen",
        type: "select",
        options: [...SPECIAL_OFFER_IMAGE_SIDE_OPTIONS],
        group: "design",
      },
      {
        key: "showCountdown",
        label: "Mostrar cuenta regresiva",
        type: "toggle",
        group: "design",
      },
      {
        key: "showUrgencyBar",
        label: "Mostrar barra de urgencia",
        type: "toggle",
        group: "design",
      },
      {
        key: "showBadge",
        label: "Mostrar etiqueta de categoría",
        type: "toggle",
        group: "design",
      },
    ],
    styles: [
      { key: "bgColor", label: "Color de Fondo de la Tarjeta", type: "color" },
      {
        key: "sectionBgColor",
        label: "Color de Fondo de la Sección",
        type: "color",
      },
      { key: "textColor", label: "Color de Texto", type: "color" },
      {
        key: "productBgColor",
        label: "Color de Fondo del Producto",
        type: "color",
      },
      {
        key: "accentColor",
        label: "Color de Acento (precio, barra, botón)",
        type: "color",
      },
    ],
    defaults: SPECIAL_OFFER_DEFAULTS,
  },
  newsletter: {
    content: [
      { key: "title", label: "Título", type: "text" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "discountText", label: "Texto de Descuento", type: "text" },
      { key: "emailPlaceholder", label: "Placeholder del Email", type: "text" },
      { key: "buttonText", label: "Texto del Botón", type: "text" },
      { key: "backgroundImage", label: "Imagen de Fondo", type: "image" },
      { key: "logoImage", label: "Logo (opcional)", type: "image" },
      {
        key: "contentAlign",
        label: "Alineación del contenido",
        type: "select",
        options: [...NEWSLETTER_CONTENT_ALIGN_OPTIONS],
        group: "design",
      },
      {
        key: "layout",
        label: "Disposición",
        type: "select",
        options: [...NEWSLETTER_LAYOUT_OPTIONS],
        group: "design",
      },
      {
        key: "showLogo",
        label: "Mostrar logo",
        type: "toggle",
        group: "design",
      },
    ],
    styles: [
      { key: "overlayColor", label: "Color del Overlay", type: "color" },
      {
        key: "overlayOpacity",
        label: "Opacidad del Overlay (0-1)",
        type: "number",
      },
      { key: "titleColor", label: "Color del Título", type: "color" },
      { key: "textColor", label: "Color del Texto", type: "color" },
      { key: "buttonColor", label: "Color del Botón", type: "color" },
    ],
    defaults: NEWSLETTER_DEFAULTS,
  },
  whyus: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "items",
        label: "Tarjetas de Beneficios",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "title", label: "Título", type: "text" },
          { key: "description", label: "Descripción", type: "text" },
          { key: "link", label: "Link (opcional)", type: "text" },
          {
            key: "icon",
            label: "Ícono",
            type: "select",
            options: WHYUS_ICON_OPTIONS,
          },
        ],
      },
      {
        key: "columns",
        label: "Columnas",
        type: "select",
        options: [...WHYUS_COLUMNS_OPTIONS],
        group: "design",
      },
      {
        key: "iconStyle",
        label: "Estilo del ícono",
        type: "select",
        options: [...WHYUS_ICON_STYLE_OPTIONS],
        group: "design",
      },
      {
        key: "contentAlign",
        label: "Alineación del contenido",
        type: "select",
        options: [...WHYUS_CONTENT_ALIGN_OPTIONS],
        group: "design",
      },
      {
        key: "iconPosition",
        label: "Posición del ícono",
        type: "select",
        options: [...WHYUS_ICON_POSITION_OPTIONS],
        group: "design",
      },
      {
        key: "layoutFormat",
        label: "Formato",
        type: "select",
        options: [...WHYUS_LAYOUT_FORMAT_OPTIONS],
        group: "design",
      },
    ],
    styles: [
      { key: "sectionBgColor", label: "Fondo de la sección", type: "color" },
      { key: "cardBgColor", label: "Fondo de la tarjeta", type: "color" },
      { key: "iconBgColor", label: "Fondo del ícono", type: "color" },
      { key: "iconColor", label: "Color del ícono", type: "color" },
      { key: "titleColor", label: "Color del título", type: "color" },
      { key: "subtitleColor", label: "Color del subtítulo", type: "color" },
    ],
    defaults: WHYUS_DEFAULTS,
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
      {
        key: "layoutVariant",
        label: "Variante de Diseño del Encabezado",
        type: "select",
        options: [...HEADER_LAYOUT_VARIANT_OPTIONS],
      },
      {
        key: "stickyMode",
        label: "Comportamiento al Desplazarse",
        type: "select",
        options: [...HEADER_STICKY_MODE_OPTIONS],
      },
      {
        key: "tagline",
        label: "Texto de la Barra de Promoción (vacío = oculta la barra)",
        type: "text",
      },
      {
        key: "megaMenuDescription",
        label: "Descripción del Menú de Categorías",
        type: "textarea",
      },
      {
        key: "viewAllText",
        label: "Texto de 'Ver Todo' (Menú de Categorías)",
        type: "text",
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
      {
        key: "megaMenuBgColor",
        label: "Color de Fondo del Menú de Categorías",
        type: "color",
      },
      {
        key: "megaMenuTextColor",
        label: "Color de Texto del Menú de Categorías",
        type: "color",
      },
      {
        key: "megaMenuFeaturedBgColor",
        label: "Color de Fondo del Producto Destacado (Menú)",
        type: "color",
      },
    ],
    defaults: HEADER_DEFAULTS,
  },
  about: {
    content: [
      { key: "title", label: "Título", type: "textarea" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "ceoName", label: "Nombre del CEO", type: "text" },
      { key: "ceoTitle", label: "Título del CEO", type: "text" },
      { key: "ceoImage", label: "URL Imagen del CEO", type: "image" },
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
    defaults: REPOSTERIA_GALLERY_DEFAULTS,
  },
  story: {
    content: [
      { key: "title", label: "Título", type: "textarea" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "buttonText", label: "Texto del Botón", type: "text" },
      { key: "buttonLink", label: "Link del Botón", type: "text" },
      { key: "image", label: "Imagen", type: "image" },
      {
        key: "imagePosition",
        label: "Posición de la imagen",
        type: "select",
        options: [...STORY_IMAGE_POSITION_OPTIONS],
        group: "design",
      },
      {
        key: "contentAlign",
        label: "Alineación del contenido",
        type: "select",
        options: [...STORY_CONTENT_ALIGN_OPTIONS],
        group: "design",
      },
    ],
    styles: [
      { key: "sectionBgColor", label: "Fondo de la sección", type: "color" },
      { key: "titleColor", label: "Color del título", type: "color" },
      { key: "subtitleColor", label: "Color de la descripción", type: "color" },
      { key: "buttonColor", label: "Color del botón", type: "color" },
      { key: "buttonTextColor", label: "Color del texto del botón", type: "color" },
    ],
    defaults: STORY_DEFAULTS,
  },
  instagram: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "description",
        label: "Descripción de la Sección",
        type: "textarea",
      },
      { key: "handle", label: "Usuario de Instagram (opcional)", type: "text" },
      {
        key: "posts",
        label: "Publicaciones",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "image", label: "Imagen", type: "image" },
          { key: "link", label: "Link (opcional)", type: "text" },
        ],
      },
      {
        key: "columns",
        label: "Columnas",
        type: "select",
        options: [...INSTAGRAM_COLUMNS_OPTIONS],
        group: "design",
      },
      {
        key: "gap",
        label: "Espaciado",
        type: "select",
        options: [...INSTAGRAM_GAP_OPTIONS],
        group: "design",
      },
    ],
    styles: [
      { key: "sectionBgColor", label: "Fondo de la sección", type: "color" },
      { key: "titleColor", label: "Color del título", type: "color" },
      { key: "subtitleColor", label: "Color del subtítulo", type: "color" },
    ],
    defaults: INSTAGRAM_DEFAULTS,
  },
  value: {
    content: [
      { key: "title", label: "Título", type: "textarea" },
      { key: "description", label: "Descripción", type: "textarea" },
      { key: "statNumber", label: "Número Estadística", type: "text" },
      { key: "statText", label: "Texto Estadística", type: "text" },
      { key: "buttonText", label: "Texto del Botón", type: "text" },
      { key: "backgroundImage", label: "URL Imagen de Fondo", type: "image" },
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
          { key: "image", label: "URL Imagen", type: "image" },
        ],
      },
      {
        key: "columns",
        label: "Columnas",
        type: "select",
        options: [...TESTIMONIALS_COLUMNS_OPTIONS],
        group: "design",
      },
      {
        key: "cardStyle",
        label: "Estilo de tarjeta",
        type: "select",
        options: [...TESTIMONIALS_CARD_STYLE_OPTIONS],
        group: "design",
      },
      {
        key: "contentAlign",
        label: "Alineación del contenido",
        type: "select",
        options: [...TESTIMONIALS_CONTENT_ALIGN_OPTIONS],
        group: "design",
      },
    ],
    styles: [
      { key: "sectionBgColor", label: "Fondo de la sección", type: "color" },
      { key: "cardBgColor", label: "Fondo de la tarjeta", type: "color" },
      { key: "titleColor", label: "Color del título", type: "color" },
      { key: "subtitleColor", label: "Color del subtítulo", type: "color" },
      { key: "quoteColor", label: "Color del testimonio", type: "color" },
      { key: "authorColor", label: "Color del autor", type: "color" },
      { key: "roleColor", label: "Color del cargo", type: "color" },
    ],
    defaults: TESTIMONIALS_DEFAULTS,
  },
  logos: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "description",
        label: "Descripción de la Sección",
        type: "textarea",
      },
      {
        key: "logos",
        label: "Logos",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "image", label: "Logo", type: "image" },
          { key: "link", label: "Link (opcional)", type: "text" },
        ],
      },
      {
        key: "columns",
        label: "Columnas",
        type: "select",
        options: [...LOGOS_COLUMNS_OPTIONS],
        group: "design",
      },
      {
        key: "size",
        label: "Tamaño",
        type: "select",
        options: [...LOGOS_SIZE_OPTIONS],
        group: "design",
      },
      {
        key: "align",
        label: "Alineación",
        type: "select",
        options: [...LOGOS_ALIGN_OPTIONS],
        group: "design",
      },
      { key: "grayscale", label: "Blanco y negro", type: "toggle", group: "design" },
    ],
    styles: [
      { key: "sectionBgColor", label: "Fondo de la sección", type: "color" },
      { key: "titleColor", label: "Color del título", type: "color" },
      { key: "subtitleColor", label: "Color del subtítulo", type: "color" },
    ],
    defaults: LOGOS_DEFAULTS,
  },
  faq: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "description",
        label: "Descripción de la Sección",
        type: "textarea",
      },
      {
        key: "items",
        label: "Preguntas frecuentes",
        type: "array",
        isArray: true,
        arrayFields: [
          { key: "question", label: "Pregunta", type: "text" },
          { key: "answer", label: "Respuesta", type: "textarea" },
        ],
      },
      {
        key: "columns",
        label: "Columnas",
        type: "select",
        options: [...FAQ_COLUMNS_OPTIONS],
        group: "design",
      },
      {
        key: "itemStyle",
        label: "Estilo de los items",
        type: "select",
        options: [...FAQ_ITEM_STYLE_OPTIONS],
        group: "design",
      },
      { key: "singleOpen", label: "Abrir de a uno", type: "toggle", group: "design" },
    ],
    styles: [
      { key: "sectionBgColor", label: "Fondo de la sección", type: "color" },
      { key: "cardBgColor", label: "Fondo de la tarjeta", type: "color" },
      { key: "borderColor", label: "Color del borde/divisor", type: "color" },
      { key: "titleColor", label: "Color del título", type: "color" },
      { key: "subtitleColor", label: "Color del subtítulo", type: "color" },
      { key: "questionColor", label: "Color de la pregunta", type: "color" },
      { key: "answerColor", label: "Color de la respuesta", type: "color" },
    ],
    defaults: FAQ_DEFAULTS,
  },
  video: {
    content: [
      { key: "title", label: "Título de la Sección", type: "text" },
      {
        key: "description",
        label: "Descripción de la Sección",
        type: "textarea",
      },
      { key: "url", label: "URL del video (YouTube, Vimeo o MP4)", type: "text" },
      { key: "poster", label: "Imagen de portada (opcional)", type: "image" },
      {
        key: "aspectRatio",
        label: "Relación de aspecto",
        type: "select",
        options: [...VIDEO_ASPECT_RATIO_OPTIONS],
        group: "design",
      },
      { key: "autoplay", label: "Autoplay (silenciado)", type: "toggle", group: "design" },
    ],
    styles: [
      { key: "sectionBgColor", label: "Fondo de la sección", type: "color" },
      { key: "titleColor", label: "Color del título", type: "color" },
      { key: "subtitleColor", label: "Color del subtítulo", type: "color" },
    ],
    defaults: VIDEO_DEFAULTS,
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
          { key: "image", label: "URL Imagen", type: "image" },
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
