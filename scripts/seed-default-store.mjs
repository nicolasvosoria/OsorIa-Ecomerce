#!/usr/bin/env node
// Go-live seed: provisions a RICH "coffee" default store into a FRESH Supabase
// project. This is NOT run against the current dev DB; it is the one-shot seed
// for the new project. It mirrors scripts/apply-default-store-baseline.mjs for
// env handling and the dry-run vs --apply --confirm contract.
//
// What it seeds (ecommerce schema only):
//   - auth users + ecommerce.user_profiles:
//       * johnjulin2@gmail.com  -> global super_admin (platform tier, no store)
//       * default@gmail.com     -> role 'user' + must_change_password, OWNER of
//                                  the default store (Plan 12: managing a store
//                                  is granted by MEMBERSHIP, not a global role)
//   - the default store (subdomain 'default') via ecommerce.provision_store,
//     then flipped is_public = true so the storefront renders
//   - satellite config: store_branding / store_contact / store_shipping_settings
//     / store_seo (+ store_seo_keywords)
//   - catalog: 4 categories, 10 products (single-origin coffees, ground/whole
//     bean, a mug, a subscription), variants, item_images, promotions
//     (compare_at_price), featured flags, and 3 combos
//   - product images uploaded to the public `products` bucket
//   - a designed home: ecommerce.component_styles (per-section look + copy),
//     ecommerce.home_section_layout (section order/visibility), and a coffee
//     theme in ecommerce.app_themes + ecommerce.app_theme_versions
//
// Default-store subdomain decision (evidence in proxy.ts + lib/utils/store.ts):
//   The apex domain resolves the storefront through getStoreBySubdomain('default')
//   (proxy.ts) and sets the x-store-id header to the store's UUID, which
//   normalizeRuntimeStoreId (lib/utils/store.ts) passes through untouched. The
//   SYMBOLIC_DEFAULT_STORE_ID = "default" sentinel that resolves to null is only
//   the *fallback* used when no such store row exists. So a real store row whose
//   subdomain is literally 'default' is fully compatible: subdomain 'default' is
//   correct and NO DEFAULT_STORE_ID env is required for the normal multi-tenant
//   path. DEFAULT_STORE_ID only matters if DISABLE_SUBDOMAIN_MULTI_TENANT=true is
//   ever set — then the operator must point it at this store's UUID (printed in
//   the apply output), because the bare 'default' fallback resolves to null.
//   provision_store creates the store unpublished (is_public=false); the storefront
//   only serves live stores (is_active && is_public), so we set is_public=true.
//
// Idempotency: deterministic slugs / item_codes / variant_codes, deterministic
// storage paths ({store_id}/seed/<key>.<ext>, upsert), and select-then-write /
// upsert-on-conflict everywhere. Re-running --apply --confirm creates no
// duplicates.
//
// Dry run (default, no DB access, no env required):
//   node scripts/seed-default-store.mjs
//
// Apply (requires NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY):
//   node scripts/seed-default-store.mjs --apply --confirm
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const ECOMMERCE_SCHEMA = "ecommerce";
const PRODUCTS_BUCKET = "products";
const PUBLIC_DIR = "public";
const LOG = "[seed-default-store]";

// ── Plan: single source of truth consumed by both dry-run and apply ──────────

const STORE = {
  subdomain: "default",
  storeName: "Cumbre Dorada Café",
  currencyCode: "COP",
};

const USERS = {
  superAdmin: {
    email: "johnjulin2@gmail.com",
    role: "super_admin",
    firstName: "John",
    lastName: "Julin",
    mustChangePassword: false,
  },
  owner: {
    email: "default@gmail.com",
    role: "user",
    firstName: "Dueño",
    lastName: "Cumbre Dorada",
    mustChangePassword: true,
  },
};

const BRANDING = {
  // Custom Cumbre Dorada wordmark + favicon (SVG, on-brand, committed under public/).
  logo_url: "/logo-cumbre-dorada.svg",
  favicon_url: "/favicon-cumbre-dorada.svg",
  primary_color: "#6F4E37", // coffee brown
  secondary_color: "#C9A227", // honey gold
};

const CONTACT = {
  contact_email: "hola@cumbredorada.co",
  contact_phone: "+57 320 000 0000",
  address: "Pitalito, Huila, Colombia",
};

// D11/D17: every store is born mode='coordinate' -- ecommerce.store_shipping_settings
// replaces the dropped store_commerce_settings, which this seed used to write
// tax_rate/shipping_enabled/free_shipping_threshold into (D4: unread values).
const SHIPPING = {
  mode: "coordinate",
};

const SEO = {
  seo_title: "Cumbre Dorada Café | Café de especialidad de Huila, Colombia",
  seo_description:
    "Café de origen cultivado en las montañas de Huila. Procesos honey, natural y lavado, tostado artesanal y envío a toda Colombia.",
  keywords: [
    "café de especialidad",
    "café de origen",
    "huila",
    "café colombiano",
    "honey",
    "natural",
    "lavado",
    "cumbre dorada",
  ],
};

const CATEGORIES = [
  {
    slug: "cafe-de-origen",
    category_name: "Café de origen",
    category_description:
      "Cafés de origen único de Huila, separados por su proceso de beneficio.",
    seo_title: "Café de origen | Cumbre Dorada",
    seo_description: "Nuestros cafés de origen único de Huila, por proceso.",
    display_order: 1,
    imageKey: "cafe-honey-primary",
  },
  {
    slug: "molido-y-grano",
    category_name: "Molido y grano",
    category_description:
      "Café molido y en grano entero, listo para tu método favorito.",
    seo_title: "Café molido y en grano | Cumbre Dorada",
    seo_description: "Café molido y grano entero de Huila, tostado artesanal.",
    display_order: 2,
    imageKey: "cafe-molido",
  },
  {
    slug: "accesorios",
    category_name: "Accesorios",
    category_description: "Mugs y accesorios para disfrutar tu café.",
    seo_title: "Accesorios de café | Cumbre Dorada",
    seo_description: "Mugs y accesorios de Cumbre Dorada Café.",
    display_order: 3,
    imageKey: "mug-cumbre",
  },
  {
    slug: "combos",
    category_name: "Combos y regalos",
    category_description:
      "Sets, cajas de regalo y suscripciones con nuestros cafés de origen.",
    seo_title: "Combos y regalos de café | Cumbre Dorada",
    seo_description: "Sets, regalos y suscripciones con cafés de Huila.",
    display_order: 4,
    imageKey: "combo-gift-box",
  },
];

// Storage key -> source file under public/. Uploaded to products bucket at the
// deterministic path {store_id}/seed/<key>.<ext> with upsert:true.
const IMAGES = {
  "cafe-honey-primary": {
    file: "coffee-bag-honey-250g-small.jpg",
    alt: "Bolsa de café honey de 250g de Cumbre Dorada",
  },
  "cafe-honey-process": {
    file: "coffee-bag-honey-process-golden-packaging.jpg",
    alt: "Proceso honey — empaque dorado",
  },
  "cafe-honey-454": {
    file: "coffee-bag-honey-454g.jpg",
    alt: "Bolsa de café honey de 454g de Cumbre Dorada",
  },
  "cafe-natural-primary": {
    file: "coffee-bag-natural-250g-small.jpg",
    alt: "Bolsa de café natural de 250g de Cumbre Dorada",
  },
  "cafe-natural-process": {
    file: "coffee-bag-natural-process-brown-packaging.jpg",
    alt: "Proceso natural — empaque marrón",
  },
  "cafe-washed-primary": {
    file: "coffee-bag-washed-454g.jpg",
    alt: "Bolsa de café lavado de 454g de Cumbre Dorada",
  },
  "cafe-washed-process": {
    file: "coffee-bag-washed-process-clean-packaging.jpg",
    alt: "Proceso lavado — empaque limpio",
  },
  "combo-trilogia": {
    file: "coffee-trilogy-set-three-bags-gift-box.jpg",
    alt: "Caja de regalo con las tres bolsas de la Trilogía Cumbre Dorada",
  },
  // New product shots.
  "cafe-molido": {
    file: "coffee-bag-molido.jpg",
    alt: "Bolsa de café molido de Cumbre Dorada",
  },
  "cafe-espresso": {
    file: "coffee-bag-espresso.jpg",
    alt: "Bolsa de café espresso de tueste oscuro de Cumbre Dorada",
  },
  "mug-cumbre": {
    file: "coffee-mug-cumbre-dorada.jpg",
    alt: "Mug de cerámica Cumbre Dorada",
  },
  "combo-gift-box": {
    file: "coffee-gift-box.jpg",
    alt: "Caja de regalo de café Cumbre Dorada",
  },
  // Atmosphere / people used by the hero, story, newsletter and galleries.
  "atmos-plantation": {
    file: "coffee-plantation-mountains-huila-colombia.jpg",
    alt: "Plantación de café en las montañas de Huila, Colombia",
  },
  "atmos-plantation-lush": {
    file: "coffee-plantation-mountains-huila-colombia-lush-gr.jpg",
    alt: "Plantación de café verde y frondosa en Huila, Colombia",
  },
  "atmos-cherries": {
    file: "coffee-cherries-branch-close-up-red.jpg",
    alt: "Cerezas de café rojas maduras en la rama",
  },
  "atmos-ceo": {
    file: "diana-ortiz-ceo-coffee-producer-portrait-professio.jpg",
    alt: "Diana Ortiz, fundadora y productora de café de Cumbre Dorada",
  },
};

// Promotions are expressed as compare_at_price (> price) on the store_item AND
// each of its variants. Featured products set is_featured = true. A variant's
// `options` is written verbatim to item_variants.variant_options (jsonb).
const PRODUCTS = [
  {
    slug: "cafe-honey",
    itemCode: "CAFE-HONEY",
    name: "Café Honey Cumbre Dorada",
    description:
      "Café de proceso honey de Huila: dulzor a panela, notas a frutas de hueso y un final acaramelado. Tostado medio, cultivado a 1.700 msnm.",
    categorySlug: "cafe-de-origen",
    basePrice: 38000,
    isFeatured: true,
    tags: ["honey", "single-origin", "huila", "specialty"],
    metadata: { origen: "Huila", altitud_msnm: 1700, proceso: "honey" },
    primaryImageKey: "cafe-honey-primary",
    galleryImageKeys: ["cafe-honey-process", "cafe-honey-454"],
    seoTitle: "Café Honey de Huila | Cumbre Dorada",
    seoDescription:
      "Café honey de origen: dulce, acaramelado y con cuerpo. Tostado artesanal.",
    variants: [
      { code: "CAFE-HONEY-250", label: "250g", options: { peso: "250g" }, price: 38000, inventory: 60, isDefault: true },
      { code: "CAFE-HONEY-454", label: "454g", options: { peso: "454g" }, price: 62000, inventory: 35, isDefault: false },
    ],
  },
  {
    slug: "cafe-natural",
    itemCode: "CAFE-NATURAL",
    name: "Café Natural Cumbre Dorada",
    description:
      "Café de proceso natural de Huila: cuerpo intenso, notas a frutos rojos maduros y chocolate. Fermentación cuidada y tueste medio.",
    categorySlug: "cafe-de-origen",
    basePrice: 40000,
    tags: ["natural", "single-origin", "huila", "specialty"],
    metadata: { origen: "Huila", altitud_msnm: 1750, proceso: "natural" },
    primaryImageKey: "cafe-natural-primary",
    galleryImageKeys: ["cafe-natural-process"],
    seoTitle: "Café Natural de Huila | Cumbre Dorada",
    seoDescription:
      "Café natural de origen: frutos rojos, chocolate y cuerpo intenso.",
    variants: [
      { code: "CAFE-NATURAL-250", label: "250g", options: { peso: "250g" }, price: 40000, inventory: 55, isDefault: true },
      { code: "CAFE-NATURAL-454", label: "454g", options: { peso: "454g" }, price: 66000, inventory: 30, isDefault: false },
    ],
  },
  {
    slug: "cafe-washed",
    itemCode: "CAFE-WASHED",
    name: "Café Washed Cumbre Dorada",
    description:
      "Café de proceso lavado de Huila: taza limpia y brillante, acidez cítrica y notas florales. El clásico de origen.",
    categorySlug: "cafe-de-origen",
    basePrice: 36000,
    // On promo: compare_at_price ~15% above price (item + each variant).
    compareAtPrice: 41400,
    tags: ["washed", "lavado", "single-origin", "huila", "specialty", "promo"],
    metadata: { origen: "Huila", altitud_msnm: 1680, proceso: "lavado" },
    primaryImageKey: "cafe-washed-primary",
    galleryImageKeys: ["cafe-washed-process"],
    seoTitle: "Café Lavado de Huila | Cumbre Dorada",
    seoDescription:
      "Café lavado de origen: taza limpia, acidez cítrica y notas florales.",
    variants: [
      { code: "CAFE-WASHED-250", label: "250g", options: { peso: "250g" }, price: 36000, compare: 41400, inventory: 60, isDefault: true },
      { code: "CAFE-WASHED-454", label: "454g", options: { peso: "454g" }, price: 60000, compare: 69000, inventory: 35, isDefault: false },
    ],
  },
  {
    slug: "cafe-molido",
    itemCode: "CAFE-MOLIDO",
    name: "Café Molido Cumbre Dorada",
    description:
      "Nuestro blend de Huila molido para greca y prensa francesa. Tueste medio, listo para preparar sin moler.",
    categorySlug: "molido-y-grano",
    basePrice: 35000,
    tags: ["molido", "blend", "huila"],
    metadata: { origen: "Huila", molienda: "media", formato: "molido" },
    primaryImageKey: "cafe-molido",
    galleryImageKeys: [],
    seoTitle: "Café Molido de Huila | Cumbre Dorada",
    seoDescription:
      "Café molido de Huila, tueste medio, listo para greca y prensa francesa.",
    variants: [
      { code: "CAFE-MOLIDO-250", label: "250g", options: { peso: "250g" }, price: 35000, inventory: 70, isDefault: true },
      { code: "CAFE-MOLIDO-454", label: "454g", options: { peso: "454g" }, price: 58000, inventory: 40, isDefault: false },
    ],
  },
  {
    slug: "cafe-espresso",
    itemCode: "CAFE-ESPRESSO",
    name: "Café Espresso Tueste Oscuro",
    description:
      "Blend de tueste oscuro pensado para espresso: cuerpo denso, notas a cacao y caramelo, crema persistente. Ideal para máquina.",
    categorySlug: "molido-y-grano",
    basePrice: 37000,
    isFeatured: true,
    tags: ["espresso", "tueste-oscuro", "blend", "huila"],
    metadata: { origen: "Huila", tueste: "oscuro", perfil: "espresso" },
    primaryImageKey: "cafe-espresso",
    galleryImageKeys: [],
    seoTitle: "Café Espresso Tueste Oscuro | Cumbre Dorada",
    seoDescription:
      "Blend de tueste oscuro para espresso: cuerpo, cacao y crema persistente.",
    variants: [
      { code: "CAFE-ESPRESSO-250", label: "250g", options: { peso: "250g" }, price: 37000, inventory: 65, isDefault: true },
      { code: "CAFE-ESPRESSO-454", label: "454g", options: { peso: "454g" }, price: 61000, inventory: 38, isDefault: false },
    ],
  },
  {
    slug: "cafe-descafeinado",
    itemCode: "CAFE-DESCAFEINADO",
    name: "Café Descafeinado",
    description:
      "Descafeinado por agua (Swiss Water), conserva dulzor y cuerpo sin cafeína. Suave y equilibrado, para disfrutar a cualquier hora.",
    categorySlug: "molido-y-grano",
    basePrice: 42000,
    // On promo: single 250g variant with compare_at_price above price.
    compareAtPrice: 49000,
    tags: ["descafeinado", "swiss-water", "huila", "promo"],
    metadata: { origen: "Huila", proceso_descafeinado: "swiss-water" },
    primaryImageKey: "cafe-washed-process",
    galleryImageKeys: [],
    seoTitle: "Café Descafeinado | Cumbre Dorada",
    seoDescription:
      "Descafeinado Swiss Water de Huila: dulce, con cuerpo y sin cafeína.",
    variants: [
      { code: "CAFE-DESCAFEINADO-250", label: "250g", options: { peso: "250g" }, price: 42000, compare: 49000, inventory: 45, isDefault: true },
    ],
  },
  {
    slug: "grano-entero-cumbre",
    itemCode: "GRANO-ENTERO-CUMBRE",
    name: "Grano Entero — Blend Cumbre",
    description:
      "Nuestro blend insignia en grano entero para que muelas al momento. Versátil para filtrado y espresso, con dulzor y buen cuerpo.",
    categorySlug: "molido-y-grano",
    basePrice: 34000,
    tags: ["grano-entero", "blend", "huila"],
    metadata: { origen: "Huila", formato: "grano-entero" },
    primaryImageKey: "cafe-honey-454",
    galleryImageKeys: [],
    seoTitle: "Grano Entero Blend Cumbre | Cumbre Dorada",
    seoDescription:
      "Blend Cumbre en grano entero de Huila: versátil para filtrado y espresso.",
    variants: [
      { code: "GRANO-CUMBRE-250", label: "250g", options: { peso: "250g" }, price: 34000, inventory: 50, isDefault: true },
      { code: "GRANO-CUMBRE-454", label: "454g", options: { peso: "454g" }, price: 56000, inventory: 32, isDefault: false },
      { code: "GRANO-CUMBRE-1000", label: "1kg", options: { peso: "1kg" }, price: 110000, inventory: 18, isDefault: false },
    ],
  },
  {
    slug: "cafe-cosecha",
    itemCode: "CAFE-COSECHA",
    name: "Café de Cosecha — Edición Limitada",
    description:
      "Microlote de cosecha seleccionado a mano, edición limitada. Perfil floral y afrutado, trazabilidad de finca. Cantidades muy reducidas.",
    categorySlug: "cafe-de-origen",
    basePrice: 58000,
    isFeatured: true,
    tags: ["edicion-limitada", "microlote", "single-origin", "huila", "specialty"],
    metadata: { origen: "Huila", edicion: "limitada", lote: "microlote" },
    primaryImageKey: "cafe-honey-process",
    galleryImageKeys: ["atmos-cherries", "atmos-plantation"],
    seoTitle: "Café de Cosecha Edición Limitada | Cumbre Dorada",
    seoDescription:
      "Microlote de cosecha de Huila, edición limitada: floral, afrutado y trazable.",
    variants: [
      { code: "CAFE-COSECHA-250", label: "250g", options: { peso: "250g" }, price: 58000, inventory: 20, isDefault: true },
    ],
  },
  {
    slug: "mug-cumbre",
    itemCode: "MUG-CUMBRE",
    name: "Mug Cumbre Dorada",
    description:
      "Mug de cerámica de 350 ml con el sello Cumbre Dorada. Ideal para tu ritual de café en casa o en la oficina.",
    categorySlug: "accesorios",
    basePrice: 32000,
    tags: ["mug", "accesorio", "ceramica"],
    metadata: { material: "cerámica", capacidad_ml: 350 },
    primaryImageKey: "mug-cumbre",
    galleryImageKeys: [],
    seoTitle: "Mug Cumbre Dorada | Cumbre Dorada",
    seoDescription: "Mug de cerámica de 350 ml con el sello Cumbre Dorada.",
    variants: [
      { code: "MUG-CUMBRE-UNICO", label: "Único", options: { tipo: "Único" }, price: 32000, inventory: 40, isDefault: true },
    ],
  },
  {
    slug: "suscripcion-mensual",
    itemCode: "SUSCRIPCION-MENSUAL",
    name: "Suscripción Mensual",
    description:
      "Recibe cada mes una bolsa de 250g de un café de origen distinto, elegido por nuestro tostador. Cancela cuando quieras.",
    categorySlug: "combos",
    basePrice: 95000,
    isFeatured: true,
    tags: ["suscripcion", "mensual", "regalo"],
    metadata: { tipo: "suscripcion", frecuencia: "mensual" },
    primaryImageKey: "combo-gift-box",
    galleryImageKeys: [],
    seoTitle: "Suscripción Mensual de Café | Cumbre Dorada",
    seoDescription:
      "Suscripción mensual: un café de origen distinto cada mes, elegido por el tostador.",
    variants: [
      { code: "SUSCRIPCION-MENSUAL-01", label: "Mensual", options: { plan: "Mensual" }, price: 95000, inventory: 100, isDefault: true },
    ],
  },
];

// Combos bundle DEFAULT variants of member products. Discount is either
// 'percentage' (discount_value = %) or 'fixed_cop' (discount_value = COP off).
// product_combos has no is_featured column, so a featured combo is flagged via
// metadata.featured (see report note).
const COMBOS = [
  {
    slug: "trilogia-cumbre-dorada",
    name: "Trilogía Cumbre Dorada",
    description:
      "La trilogía completa: nuestros tres procesos —honey, natural y lavado— en una caja de regalo. Descubre cómo el proceso transforma el mismo grano de Huila.",
    imageKey: "combo-trilogia",
    discount_type: "percentage",
    discount_value: 15,
    featured: true,
    seo_title: "Trilogía Cumbre Dorada | Caja de regalo de café",
    seo_description:
      "Los tres procesos de Cumbre Dorada en una caja de regalo, con 15% de descuento.",
    componentProductSlugs: ["cafe-honey", "cafe-natural", "cafe-washed"],
  },
  {
    slug: "caja-regalo-cumbre",
    name: "Caja Regalo Cumbre",
    description:
      "Caja de regalo con nuestro café molido y el blend en grano entero. Un obsequio perfecto para amantes del café.",
    imageKey: "combo-gift-box",
    discount_type: "percentage",
    discount_value: 12,
    featured: true,
    seo_title: "Caja Regalo Cumbre | Regalo de café",
    seo_description:
      "Café molido y grano entero de Cumbre Dorada en una caja de regalo, con 12% de descuento.",
    componentProductSlugs: ["cafe-molido", "grano-entero-cumbre"],
  },
  {
    slug: "combo-oficina",
    name: "Combo Oficina",
    description:
      "El dúo para la oficina: espresso de tueste oscuro y café molido para greca. Rinde para todo el equipo.",
    imageKey: "cafe-molido",
    discount_type: "fixed_cop",
    discount_value: 10000,
    featured: false,
    seo_title: "Combo Oficina | Café para la oficina",
    seo_description:
      "Espresso de tueste oscuro y café molido de Cumbre Dorada, con $10.000 de descuento.",
    componentProductSlugs: ["cafe-espresso", "cafe-molido"],
  },
];

// Each combo component bundles the DEFAULT variant of its product, qty 1.
function defaultVariantCode(product) {
  return product.variants.find((v) => v.isDefault)?.code;
}

// ── Home composition + theme ─────────────────────────────────────────────────
//
// home_section_layout.sections is an array of { key, enabled } (see
// lib/sections/home-composition.ts:39-58 for the validated shape). Keys MUST be
// members of COMPOSABLE_SECTION_KEYS; unknown keys are dropped on read. There is
// NO "categories" composable section, so the browse/catalog slot is served by
// the "products" grid (selectionMode best_selling). Order below reflects:
// hero -> featured -> popular -> products(catalog) -> specialOffer -> whyus ->
// story -> newsletter.
const HOME_SECTION_LAYOUT = [
  { key: "hero", enabled: true },
  { key: "featured", enabled: true },
  { key: "popular", enabled: true },
  { key: "products", enabled: true },
  { key: "specialOffer", enabled: true },
  { key: "whyus", enabled: true },
  { key: "story", enabled: true },
  { key: "newsletter", enabled: true },
];

// Coffee palette shared by the theme and the section styles.
const PALETTE = {
  coffee: "#6F4E37", // coffee brown
  honey: "#C9A227", // honey gold
  cream: "#FBF7F0", // warm cream background
  espresso: "#3B2A1E", // dark text
  sand: "#E7DBC9", // warm border
  mutedCream: "#F1E7D6",
  mutedBrown: "#8A7358",
  caramel: "#8A5A2B",
};

// app_themes.colors and app_theme_versions.variables.colorsLight both use the
// full 10-key ThemeColors shape (lib/theme-font/runtime-contract.ts:141-183);
// normalizeThemeRecord returns null if any key is missing, so all 10 are set.
const COFFEE_COLORS_LIGHT = {
  primary: PALETTE.coffee,
  secondary: PALETTE.honey,
  accent: PALETTE.honey,
  background: PALETTE.cream,
  foreground: PALETTE.espresso,
  card: "#FFFFFF",
  cardForeground: PALETTE.espresso,
  border: PALETTE.sand,
  muted: PALETTE.mutedCream,
  mutedForeground: PALETTE.mutedBrown,
};

const COFFEE_COLORS_DARK = {
  primary: "#E0B450",
  secondary: "#3A2A1D",
  accent: "#D8A24A",
  background: "#1E1712",
  foreground: "#F0E6D8",
  card: "#2A2018",
  cardForeground: "#F0E6D8",
  border: "#40301F",
  muted: "#372A1D",
  mutedForeground: "#BBA98F",
};

const COFFEE_THEME = {
  themeName: "Cumbre Dorada",
  // Font pairing resolved at apply time by name (fonts exist via migration
  // 20260702000100). space-grotesk-inter = Space Grotesk heading + Inter body.
  fontPairingName: "space-grotesk-inter",
  // variables jsonb = ThemeDefinition (colorsLight/colorsDark/radius/density/
  // shadow/shape). Boutique-flavored warm tokens fit specialty coffee; the
  // shadow rgba values are coffee-brown tinted.
  definition: {
    colorsLight: COFFEE_COLORS_LIGHT,
    colorsDark: COFFEE_COLORS_DARK,
    radius: { base: "0.75rem" },
    density: { scale: 1.05 },
    shadow: {
      card: "0 6px 18px -6px rgba(74,53,39,.2)",
      elevated: "0 16px 34px -12px rgba(74,53,39,.3)",
    },
    shape: { button: "9999px", card: "1rem" },
  },
};

// Per-section look + copy for ecommerce.component_styles, keyed by
// component_name. Mirrors the shapes proven by data/default-store-baseline.json
// (the 10 baseline keys) plus `story`. featured/specialOffer resolve a real
// seeded product id at apply time; images resolve to uploaded public URLs.
function buildComponentStyles(imageUrls, productContext) {
  const productId = (slug) => productContext.idBySlug[slug];
  return {
    footer: {},
    header: {
      brandName: "Cumbre Dorada",
      brandSubtitle: "Café de especialidad",
      layoutVariant: "classic",
      logoImage: "/logo-cumbre-dorada.svg",
      logoImageDark: "/logo-cumbre-dorada-dark.svg",
    },
    site_background: {
      backgroundColor: PALETTE.cream,
      backgroundImage: "",
      backgroundPosition: "bottom right",
      type: "color",
    },
    hero: {
      backgroundMode: "stage",
      textColor: PALETTE.cream,
      overlayColor: "#241A12",
      overlayOpacity: "0.5",
      buttonColor: PALETTE.honey,
      fullImageContentAlign: "left",
      imagePositionY: "bottom",
      layoutMode: "full-image",
      products: [
        {
          backgroundImage: imageUrls["atmos-plantation"],
          buttonText: "Comprar café",
          contentOffsetX: 0,
          contentOffsetY: 0,
          description:
            "Café de origen cultivado a más de 1.700 msnm en las montañas de Huila. Procesos honey, natural y lavado, tostado artesanal.",
          hotspots: [],
          image: imageUrls["atmos-plantation"],
          label: "Café de especialidad",
          productImage: imageUrls["cafe-honey-primary"],
          productOffsetX: 0,
          productOffsetY: 0,
          productPlacement: "right",
          productPresence: "balanced",
          productScale: 140,
          subtitle: "Huila, Colombia",
          textSize: "feature",
          title: "Cumbre Dorada Café",
        },
      ],
    },
    popular: {
      priceLabel: "Desde $32.000",
      title: "Lo más vendido",
    },
    products: {
      cardBgColor: "#FFFFFF",
      columns: "2",
      cornerRadius: "xl",
      description: "Explora todo nuestro café de origen, molido y en grano.",
      eyebrow: "Catálogo",
      selectionMode: "best_selling",
      title: "Nuestro café",
    },
    featured: {
      bgColor: PALETTE.coffee,
      cardBgColor: PALETTE.cream,
      linkText: "Ver todo el café",
      mainImage: imageUrls["cafe-washed-primary"],
      originalPrice: "$41.400",
      productBgColor: PALETTE.honey,
      productId: productId("cafe-washed"),
      productImage: "",
      productName: "Café Washed Cumbre Dorada",
      salePrice: "$36.000",
      subtitle: "Proceso lavado — taza limpia y brillante",
      textColor: "#ffffff",
      title: "El clásico de origen, en promoción",
    },
    specialOffer: {
      accentColor: PALETTE.honey,
      bgColor: PALETTE.coffee,
      claimedLabel: "Ya reclamado 40%",
      countdownLabel: "La oferta termina en:",
      description:
        "Nuestro descafeinado Swiss Water, suave y con cuerpo, por tiempo limitado.",
      endDate: "2026-08-31T23:59",
      eyebrow: "Oferta",
      href: "/products/cafe-descafeinado",
      image: imageUrls["cafe-washed-process"],
      linkText: "Comprar ahora",
      originalPrice: "$49.000",
      productBgColor: PALETTE.caramel,
      productId: productId("cafe-descafeinado"),
      productName: "Café Descafeinado",
      salePrice: "$42.000",
      textColor: "#ffffff",
      title: "Oferta especial",
    },
    whyus: {
      title: "¿Por qué Cumbre Dorada?",
      iconStyle: "roundedSquare",
      iconPosition: "top",
      columns: "4",
      items: [
        { icon: "star", title: "Café de especialidad", description: "Puntaje SCA 84+", link: "" },
        { icon: "shipping", title: "Envío a toda Colombia", description: "Gratis desde $150.000", link: "" },
        { icon: "support", title: "Tostado bajo pedido", description: "Frescura garantizada", link: "" },
        { icon: "payment", title: "Pago seguro", description: "Tarjeta, PSE, Nequi", link: "" },
      ],
    },
    story: {
      title: "Nuestra historia",
      description:
        "Cumbre Dorada nace en las montañas de Huila, donde familias caficultoras cultivan a más de 1.700 msnm. Seleccionamos, fermentamos y tostamos cada lote con cuidado artesanal para llevar el origen hasta tu taza.",
      buttonText: "Conoce el origen",
      buttonLink: "/nosotros",
      image: imageUrls["atmos-ceo"],
      imagePosition: "right",
      contentAlign: "left",
    },
    newsletter: {
      backgroundImage: imageUrls["atmos-plantation-lush"],
      buttonColor: PALETTE.honey,
      buttonText: "Suscribirme",
      description:
        "Recibe lanzamientos, ediciones limitadas y un 10% de descuento en tu primera compra.",
      discountText: "10% de descuento en tu primera compra",
      emailPlaceholder: "Tu correo electrónico",
      logoImage: "",
      overlayOpacity: "0.55",
      title: "Únete a Cumbre Dorada",
    },
  };
}

// ── Entry point ──────────────────────────────────────────────────────────────

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply") && args.has("--confirm");

main().catch((error) => {
  console.error(`${LOG} Failed:`, error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  if (!shouldApply) {
    await printDryRun();
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createSupabaseClient(createClient);
  const ecommerce = supabase.schema(ECOMMERCE_SCHEMA);

  await ensureImagesExistOrThrow();

  // 1) Identities. The owner profile must exist BEFORE provision_store runs.
  const superAdmin = await ensureAuthUser(supabase, USERS.superAdmin.email);
  reportCreatedUser(USERS.superAdmin.email, superAdmin);
  await ensureUserProfile(ecommerce, { id: superAdmin.id, ...USERS.superAdmin });

  const owner = await ensureAuthUser(supabase, USERS.owner.email);
  reportCreatedUser(USERS.owner.email, owner);
  await ensureUserProfile(ecommerce, { id: owner.id, ...USERS.owner });

  // 2) Store (provision unpublished, then publish) + satellite config.
  const storeId = await ensureStore(ecommerce, owner.id);
  await upsertSatelliteConfig(ecommerce, storeId);

  // 3) Images -> products bucket (deterministic paths, upsert).
  const imageUrls = await uploadSeedImages(supabase, storeId);

  // 4) Catalog.
  const categoryIdBySlug = await ensureCategories(ecommerce, storeId, imageUrls);
  const productContext = await ensureProducts(ecommerce, storeId, categoryIdBySlug, imageUrls);
  await ensureCombos(ecommerce, storeId, imageUrls, productContext);

  // 5) Designed home + theme (best-effort; the app sanitizes invalid shapes to
  // defaults, so a bad field is ignored, never fatal).
  await ensureComponentStyles(ecommerce, storeId, buildComponentStyles(imageUrls, productContext));
  await ensureHomeComposition(ecommerce, storeId);
  await ensureTheme(ecommerce, storeId);

  console.log(
    `${LOG} Done. Store "${STORE.subdomain}" id=${storeId} — ${PRODUCTS.length} products, ${COMBOS.length} combos, ${CATEGORIES.length} categories, ${Object.keys(IMAGES).length} images; home: ${HOME_SECTION_LAYOUT.length} sections + component_styles + coffee theme.`,
  );
  console.log(
    `${LOG} If DISABLE_SUBDOMAIN_MULTI_TENANT=true is ever set, point DEFAULT_STORE_ID at ${storeId}.`,
  );
}

// ── Dry run ──────────────────────────────────────────────────────────────────

async function printDryRun() {
  console.log(`${LOG} Dry run only. No Supabase writes, no env required.`);
  console.log(
    `${LOG} Store: subdomain="${STORE.subdomain}" name="${STORE.storeName}" currency=${STORE.currencyCode} (will be published: is_public=true)`,
  );
  console.log(`${LOG} Users:`);
  console.log(`${LOG}   super_admin -> ${USERS.superAdmin.email} (no store membership)`);
  console.log(
    `${LOG}   owner       -> ${USERS.owner.email} (role 'user', must_change_password, OWNER of "${STORE.subdomain}")`,
  );
  console.log(`${LOG} Categories: ${CATEGORIES.map((c) => `${c.category_name} (${c.slug})`).join(", ")}`);

  console.log(`${LOG} Products:`);
  for (const product of PRODUCTS) {
    const variants = product.variants
      .map((v) => {
        const promo = v.compare ? ` (was $${v.compare.toLocaleString("es-CO")})` : "";
        return `${v.label} $${v.price.toLocaleString("es-CO")}${promo} (stock ${v.inventory})`;
      })
      .join(" | ");
    const flags = [
      product.isFeatured ? "FEATURED" : null,
      product.compareAtPrice ? "PROMO" : null,
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`${LOG}   - ${product.name} [${product.itemCode}/${product.slug}] cat=${product.categorySlug}${flags ? ` [${flags}]` : ""}`);
    console.log(`${LOG}       base $${product.basePrice.toLocaleString("es-CO")} COP · variants: ${variants}`);
    console.log(`${LOG}       primary=${IMAGES[product.primaryImageKey].file}; gallery=${product.galleryImageKeys.map((k) => IMAGES[k].file).join(", ") || "(none)"}`);
  }

  console.log(`${LOG} Combos:`);
  for (const combo of COMBOS) {
    const discount =
      combo.discount_type === "percentage"
        ? `${combo.discount_value}%`
        : `$${combo.discount_value.toLocaleString("es-CO")} off`;
    console.log(
      `${LOG}   - ${combo.name} [${combo.slug}] discount=${discount}${combo.featured ? " [FEATURED]" : ""} · image=${IMAGES[combo.imageKey].file}`,
    );
    console.log(
      `${LOG}       components: ${combo.componentProductSlugs.map((slug) => `${slug}@${defaultVariantCode(findProduct(slug))}`).join(", ")}`,
    );
  }

  console.log(
    `${LOG} Home sections (order): ${HOME_SECTION_LAYOUT.map((s) => s.key).join(" -> ")}`,
  );
  console.log(
    `${LOG} component_styles keys: ${Object.keys(buildComponentStyles({}, { idBySlug: {} })).join(", ")}`,
  );
  console.log(
    `${LOG} Theme: "${COFFEE_THEME.themeName}" · font pairing "${COFFEE_THEME.fontPairingName}" · primary ${PALETTE.coffee} / honey ${PALETTE.honey} / cream ${PALETTE.cream}`,
  );

  console.log(`${LOG} Image upload plan (bucket "${PRODUCTS_BUCKET}", path <store_id>/seed/<key>.<ext>):`);
  for (const [key, image] of Object.entries(IMAGES)) {
    const exists = await fileExists(path.join(PUBLIC_DIR, image.file));
    console.log(`${LOG}   [${exists ? "ok" : "MISSING"}] ${key} <- public/${image.file}`);
  }

  console.log(`${LOG} Apply command: node scripts/seed-default-store.mjs --apply --confirm`);
}

// ── Supabase client + env ────────────────────────────────────────────────────

function createSupabaseClient(createClient) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY are required for --apply.",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── Identities ───────────────────────────────────────────────────────────────

// Creates the auth user with a strong temp password, or reuses the existing one
// (idempotent). Returns { id, created }. The password is only ever set/known for
// a freshly created user; it is never written to disk.
async function ensureAuthUser(supabase, email) {
  const password = generateTempPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data?.user) {
    return { id: data.user.id, created: true, password };
  }

  if (error && !isAlreadyRegistered(error)) {
    throw new Error(`Could not create auth user ${email}: ${error.message}`);
  }

  const existingId = await findAuthUserIdByEmail(supabase, email);
  if (!existingId) {
    throw new Error(`Auth user ${email} reported as existing but could not be found.`);
  }
  return { id: existingId, created: false };
}

function isAlreadyRegistered(error) {
  const code = String(error.code || "").toLowerCase();
  const message = String(error.message || "").toLowerCase();
  return (
    code === "email_exists" ||
    code === "user_already_exists" ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("already exists")
  );
}

async function findAuthUserIdByEmail(supabase, email) {
  const perPage = 200;
  const target = email.toLowerCase();
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Could not list auth users: ${error.message}`);
    const users = data?.users ?? [];
    const match = users.find((user) => (user.email || "").toLowerCase() === target);
    if (match) return match.id;
    if (users.length < perPage) return null;
  }
}

function reportCreatedUser(email, result) {
  if (result.created) {
    console.log(
      `${LOG} Created auth user ${email} — TEMPORARY PASSWORD (shown ONLY now, store it securely): ${result.password}`,
    );
  } else {
    console.log(`${LOG} Auth user ${email} already existed; reusing id=${result.id}.`);
  }
}

// Insert the profile if missing; if present, refresh the mutable identity fields
// but never clobber must_change_password (the owner may have already cleared it).
async function ensureUserProfile(ecommerce, profile) {
  const { data: existing, error: readError } = await ecommerce
    .from("user_profiles")
    .select("id")
    .eq("id", profile.id)
    .maybeSingle();
  if (readError) throw new Error(`Could not read user_profiles for ${profile.email}: ${readError.message}`);

  if (existing) {
    const { error } = await ecommerce
      .from("user_profiles")
      .update({
        email: profile.email,
        role: profile.role,
        first_name: profile.firstName,
        last_name: profile.lastName,
        updated_at: nowIso(),
      })
      .eq("id", profile.id);
    if (error) throw new Error(`Could not update user_profiles for ${profile.email}: ${error.message}`);
    console.log(`${LOG} user_profiles: refreshed ${profile.email} (role=${profile.role}).`);
    return;
  }

  const { error } = await ecommerce.from("user_profiles").insert({
    id: profile.id,
    email: profile.email,
    role: profile.role,
    first_name: profile.firstName,
    last_name: profile.lastName,
    must_change_password: profile.mustChangePassword,
  });
  if (error) throw new Error(`Could not insert user_profiles for ${profile.email}: ${error.message}`);
  console.log(`${LOG} user_profiles: created ${profile.email} (role=${profile.role}).`);
}

// ── Store ────────────────────────────────────────────────────────────────────

async function ensureStore(ecommerce, ownerId) {
  const { data: existing, error: readError } = await ecommerce
    .from("stores")
    .select("id")
    .eq("subdomain", STORE.subdomain)
    .maybeSingle();
  if (readError) throw new Error(`Could not read stores: ${readError.message}`);

  let storeId = existing?.id;
  if (storeId) {
    console.log(`${LOG} stores: "${STORE.subdomain}" already exists (id=${storeId}); skipping provision.`);
  } else {
    const { data, error } = await ecommerce.rpc("provision_store", {
      p_subdomain: STORE.subdomain,
      p_store_name: STORE.storeName,
      p_owner_user_id: ownerId,
      p_currency_code: STORE.currencyCode,
    });
    if (error) throw new Error(`provision_store failed: ${error.message}`);
    storeId = data;
    console.log(`${LOG} stores: provisioned "${STORE.subdomain}" (id=${storeId}) with owner ${USERS.owner.email}.`);
  }

  // provision_store creates the store unpublished; publish it so the storefront
  // serves it (proxy.isStoreLive requires is_active && is_public).
  const { error: publishError } = await ecommerce
    .from("stores")
    .update({ is_public: true, is_active: true, updated_at: nowIso() })
    .eq("id", storeId);
  if (publishError) throw new Error(`Could not publish store: ${publishError.message}`);
  console.log(`${LOG} stores: "${STORE.subdomain}" published (is_public=true, is_active=true).`);

  return storeId;
}

async function upsertSatelliteConfig(ecommerce, storeId) {
  await upsertByStoreId(ecommerce, "store_branding", { store_id: storeId, ...BRANDING });
  await upsertByStoreId(ecommerce, "store_contact", { store_id: storeId, ...CONTACT });
  await upsertByStoreId(ecommerce, "store_shipping_settings", { store_id: storeId, ...SHIPPING });
  await upsertByStoreId(ecommerce, "store_seo", {
    store_id: storeId,
    seo_title: SEO.seo_title,
    seo_description: SEO.seo_description,
  });

  const { data: existing, error: readError } = await ecommerce
    .from("store_seo_keywords")
    .select("keyword")
    .eq("store_id", storeId);
  if (readError) throw new Error(`Could not read store_seo_keywords: ${readError.message}`);
  const present = new Set((existing ?? []).map((row) => row.keyword));
  const missing = SEO.keywords.filter((keyword) => !present.has(keyword));
  if (missing.length > 0) {
    const { error } = await ecommerce
      .from("store_seo_keywords")
      .insert(missing.map((keyword) => ({ store_id: storeId, keyword })));
    if (error) throw new Error(`Could not insert store_seo_keywords: ${error.message}`);
  }
  console.log(`${LOG} satellite config upserted (branding/contact/commerce/seo + ${SEO.keywords.length} keywords).`);
}

async function upsertByStoreId(ecommerce, table, row) {
  const { error } = await ecommerce
    .from(table)
    .upsert({ ...row, updated_at: nowIso() }, { onConflict: "store_id" });
  if (error) throw new Error(`Could not upsert ${table}: ${error.message}`);
}

// ── Images ───────────────────────────────────────────────────────────────────

async function ensureImagesExistOrThrow() {
  const missing = [];
  for (const image of Object.values(IMAGES)) {
    if (!(await fileExists(path.join(PUBLIC_DIR, image.file)))) missing.push(image.file);
  }
  if (missing.length > 0) {
    throw new Error(`Missing source image(s) under ${PUBLIC_DIR}/: ${missing.join(", ")}`);
  }
}

// Uploads every image to {store_id}/seed/<key>.<ext> (upsert) and returns a
// map of key -> public URL.
async function uploadSeedImages(supabase, storeId) {
  const urls = {};
  for (const [key, image] of Object.entries(IMAGES)) {
    const ext = path.extname(image.file) || ".jpg";
    const objectPath = `${storeId}/seed/${key}${ext}`;
    const buffer = await fs.readFile(path.join(PUBLIC_DIR, image.file));
    const { error } = await supabase.storage
      .from(PRODUCTS_BUCKET)
      .upload(objectPath, buffer, { upsert: true, contentType: contentTypeFor(ext) });
    if (error) throw new Error(`Could not upload ${image.file}: ${error.message}`);
    const { data } = supabase.storage.from(PRODUCTS_BUCKET).getPublicUrl(objectPath);
    urls[key] = data.publicUrl;
  }
  console.log(`${LOG} uploaded ${Object.keys(urls).length} images to bucket "${PRODUCTS_BUCKET}".`);
  return urls;
}

function contentTypeFor(ext) {
  const normalized = ext.toLowerCase();
  if (normalized === ".png") return "image/png";
  if (normalized === ".webp") return "image/webp";
  if (normalized === ".svg") return "image/svg+xml";
  return "image/jpeg";
}

// ── Catalog: categories ──────────────────────────────────────────────────────

async function ensureCategories(ecommerce, storeId, imageUrls) {
  const idBySlug = {};
  for (const category of CATEGORIES) {
    const fields = {
      category_name: category.category_name,
      category_description: category.category_description,
      seo_title: category.seo_title,
      seo_description: category.seo_description,
      display_order: category.display_order,
      category_image_url: category.imageKey ? imageUrls[category.imageKey] : null,
      updated_at: nowIso(),
    };

    const { data: existing, error: readError } = await ecommerce
      .from("item_categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", category.slug)
      .maybeSingle();
    if (readError) throw new Error(`Could not read item_categories: ${readError.message}`);

    if (existing) {
      const { error } = await ecommerce
        .from("item_categories")
        .update(fields)
        .eq("id", existing.id);
      if (error) throw new Error(`Could not update category ${category.slug}: ${error.message}`);
      idBySlug[category.slug] = existing.id;
      continue;
    }

    const { data, error } = await ecommerce
      .from("item_categories")
      .insert({ store_id: storeId, slug: category.slug, ...fields })
      .select("id")
      .single();
    if (error) throw new Error(`Could not insert category ${category.slug}: ${error.message}`);
    idBySlug[category.slug] = data.id;
  }
  console.log(`${LOG} categories ensured: ${CATEGORIES.map((c) => c.slug).join(", ")}.`);
  return idBySlug;
}

// ── Catalog: products + variants + images ────────────────────────────────────

async function ensureProducts(ecommerce, storeId, categoryIdBySlug, imageUrls) {
  const idBySlug = {};
  const variantIdByCode = {};

  for (const product of PRODUCTS) {
    const primaryUrl = imageUrls[product.primaryImageKey];
    const totalInventory = product.variants.reduce((sum, v) => sum + v.inventory, 0);

    const mutableFields = {
      item_name: product.name,
      item_description: product.description,
      category_id: categoryIdBySlug[product.categorySlug],
      base_price: product.basePrice,
      compare_at_price: product.compareAtPrice ?? null,
      currency_code: STORE.currencyCode,
      is_active: true,
      is_featured: product.isFeatured === true,
      is_available_for_sale: true,
      track_inventory: true,
      inventory_quantity: totalInventory,
      tags: product.tags,
      seo_title: product.seoTitle,
      seo_description: product.seoDescription,
      primary_image_url: primaryUrl,
      primary_image_alt: product.name,
      metadata: product.metadata,
      updated_at: nowIso(),
    };

    const { data: existing, error: readError } = await ecommerce
      .from("store_items")
      .select("id")
      .eq("store_id", storeId)
      .eq("item_slug", product.slug)
      .maybeSingle();
    if (readError) throw new Error(`Could not read store_items for ${product.slug}: ${readError.message}`);

    let itemId = existing?.id;
    if (itemId) {
      const { error } = await ecommerce.from("store_items").update(mutableFields).eq("id", itemId);
      if (error) throw new Error(`Could not update store_items ${product.slug}: ${error.message}`);
    } else {
      const { data, error } = await ecommerce
        .from("store_items")
        .insert({
          store_id: storeId,
          item_code: product.itemCode,
          item_slug: product.slug,
          ...mutableFields,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Could not insert store_items ${product.slug}: ${error.message}`);
      itemId = data.id;
    }
    idBySlug[product.slug] = itemId;

    variantIdByCode[product.slug] = await ensureVariants(ecommerce, itemId, product);
    await ensureItemImages(ecommerce, itemId, product, imageUrls);
  }

  console.log(`${LOG} products ensured: ${PRODUCTS.map((p) => p.slug).join(", ")}.`);
  return { idBySlug, variantIdByCode };
}

async function ensureVariants(ecommerce, itemId, product) {
  const idByCode = {};
  for (const variant of product.variants) {
    const fields = {
      price: variant.price,
      compare_at_price: variant.compare ?? null,
      variant_options: variant.options,
      track_inventory: true,
      inventory_quantity: variant.inventory,
      is_available: true,
      is_default: variant.isDefault,
      updated_at: nowIso(),
    };

    const { data: existing, error: readError } = await ecommerce
      .from("item_variants")
      .select("id")
      .eq("item_id", itemId)
      .eq("variant_code", variant.code)
      .maybeSingle();
    if (readError) throw new Error(`Could not read item_variants for ${variant.code}: ${readError.message}`);

    if (existing) {
      const { error } = await ecommerce.from("item_variants").update(fields).eq("id", existing.id);
      if (error) throw new Error(`Could not update item_variants ${variant.code}: ${error.message}`);
      idByCode[variant.code] = existing.id;
      continue;
    }

    const { data, error } = await ecommerce
      .from("item_variants")
      .insert({ item_id: itemId, variant_code: variant.code, ...fields })
      .select("id")
      .single();
    if (error) throw new Error(`Could not insert item_variants ${variant.code}: ${error.message}`);
    idByCode[variant.code] = data.id;
  }
  return idByCode;
}

// item_images has no natural unique key, so keep re-runs clean by inserting only
// image_urls not already present for the item (URLs are deterministic).
async function ensureItemImages(ecommerce, itemId, product, imageUrls) {
  const { data: existing, error: readError } = await ecommerce
    .from("item_images")
    .select("image_url")
    .eq("item_id", itemId);
  if (readError) throw new Error(`Could not read item_images for ${product.slug}: ${readError.message}`);
  const present = new Set((existing ?? []).map((row) => row.image_url));

  const rows = product.galleryImageKeys
    .map((key, index) => ({
      item_id: itemId,
      image_url: imageUrls[key],
      image_alt: IMAGES[key].alt,
      image_type: "product",
      display_order: index + 1,
    }))
    .filter((row) => !present.has(row.image_url));

  if (rows.length > 0) {
    const { error } = await ecommerce.from("item_images").insert(rows);
    if (error) throw new Error(`Could not insert item_images for ${product.slug}: ${error.message}`);
  }
}

// ── Catalog: combos ──────────────────────────────────────────────────────────

async function ensureCombos(ecommerce, storeId, imageUrls, productContext) {
  for (const combo of COMBOS) {
    await ensureCombo(ecommerce, storeId, imageUrls, productContext, combo);
  }
  console.log(`${LOG} combos ensured: ${COMBOS.map((c) => c.slug).join(", ")}.`);
}

async function ensureCombo(ecommerce, storeId, imageUrls, productContext, combo) {
  const comboFields = {
    name: combo.name,
    description: combo.description,
    image_url: imageUrls[combo.imageKey],
    is_active: true,
    discount_type: combo.discount_type,
    discount_value: combo.discount_value,
    seo_title: combo.seo_title,
    seo_description: combo.seo_description,
    // product_combos has no is_featured column; carry the intent in metadata.
    metadata: { featured: combo.featured === true },
    updated_at: nowIso(),
  };

  const { data: existing, error: readError } = await ecommerce
    .from("product_combos")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", combo.slug)
    .maybeSingle();
  if (readError) throw new Error(`Could not read product_combos: ${readError.message}`);

  let comboId = existing?.id;
  if (comboId) {
    const { error } = await ecommerce.from("product_combos").update(comboFields).eq("id", comboId);
    if (error) throw new Error(`Could not update product_combos ${combo.slug}: ${error.message}`);
  } else {
    const { data, error } = await ecommerce
      .from("product_combos")
      .insert({ store_id: storeId, slug: combo.slug, ...comboFields })
      .select("id")
      .single();
    if (error) throw new Error(`Could not insert product_combos ${combo.slug}: ${error.message}`);
    comboId = data.id;
  }

  await ensureComboComponents(ecommerce, comboId, productContext, combo);
}

async function ensureComboComponents(ecommerce, comboId, productContext, combo) {
  const rows = combo.componentProductSlugs.map((slug, index) => {
    const product = findProduct(slug);
    const variantCode = defaultVariantCode(product);
    const productId = productContext.idBySlug[slug];
    const variantId = productContext.variantIdByCode[slug][variantCode];
    if (!productId || !variantId) {
      throw new Error(`Combo ${combo.slug} component ${slug} is missing its product/variant id.`);
    }
    return {
      combo_id: comboId,
      product_id: productId,
      variant_id: variantId,
      quantity: 1,
      display_order: index,
    };
  });

  // Unique(combo_id, product_id, variant_id) makes this upsert a clean no-op on re-run.
  const { error } = await ecommerce
    .from("product_combo_components")
    .upsert(rows, { onConflict: "combo_id,product_id,variant_id" });
  if (error) throw new Error(`Could not upsert product_combo_components for ${combo.slug}: ${error.message}`);
}

// ── Home composition + component styles + theme ──────────────────────────────

// Upserts one ecommerce.component_styles row per component_name (unique on
// (store_id, component_name)); mirrors scripts/apply-default-store-baseline.mjs.
async function ensureComponentStyles(ecommerce, storeId, styles) {
  const rows = Object.entries(styles).map(([componentName, variables]) => ({
    store_id: storeId,
    component_name: componentName,
    variables,
    updated_at: nowIso(),
  }));

  const { error } = await ecommerce
    .from("component_styles")
    .upsert(rows, { onConflict: "store_id,component_name" });
  if (error) throw new Error(`Could not upsert component_styles: ${error.message}`);
  console.log(`${LOG} component_styles upserted: ${rows.map((r) => r.component_name).join(", ")}.`);
}

// Upserts the store's home section order/visibility (unique on store_id).
async function ensureHomeComposition(ecommerce, storeId) {
  const { error } = await ecommerce
    .from("home_section_layout")
    .upsert(
      { store_id: storeId, sections: HOME_SECTION_LAYOUT, updated_at: nowIso() },
      { onConflict: "store_id" },
    );
  if (error) throw new Error(`Could not upsert home_section_layout: ${error.message}`);
  console.log(
    `${LOG} home_section_layout upserted: ${HOME_SECTION_LAYOUT.map((s) => s.key).join(" -> ")}.`,
  );
}

// Seeds the coffee theme: an app_themes preset row (full 10-color light
// palette) plus one CURRENT app_theme_versions row carrying the two-axis
// definition in `variables` and the resolved font pairing in `fonts`. Idempotent
// per store: re-running updates the existing coffee version in place (no history
// growth) and respects the one-current-per-store partial-unique index.
async function ensureTheme(ecommerce, storeId) {
  const themeId = await ensureAppTheme(ecommerce);
  const fontPairingId = await resolveFontPairingId(ecommerce, COFFEE_THEME.fontPairingName);

  // variables jsonb = ThemeDefinition; getActiveTheme lifts fontPairingId from
  // `fonts`, so it must live there. Store it in variables too, matching the app's
  // theme-activation route (app/api/admin/theme-activation/route.ts:149-205).
  const variables = { ...COFFEE_THEME.definition, fontPairingId };
  const fonts = { fontPairingId };

  const { data: existing, error: readError } = await ecommerce
    .from("app_theme_versions")
    .select("id")
    .eq("store_id", storeId)
    .eq("theme_id", themeId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readError) throw new Error(`Could not read app_theme_versions: ${readError.message}`);

  if (existing) {
    // Clear any OTHER current version first so only one is_current row remains.
    const { error: clearError } = await ecommerce
      .from("app_theme_versions")
      .update({ is_current: false })
      .eq("store_id", storeId)
      .eq("is_current", true)
      .neq("id", existing.id);
    if (clearError) throw new Error(`Could not clear current theme version: ${clearError.message}`);

    const { error } = await ecommerce
      .from("app_theme_versions")
      .update({ variables, fonts, is_current: true, is_custom: false })
      .eq("id", existing.id);
    if (error) throw new Error(`Could not update app_theme_versions: ${error.message}`);
  } else {
    const { error: clearError } = await ecommerce
      .from("app_theme_versions")
      .update({ is_current: false })
      .eq("store_id", storeId)
      .eq("is_current", true);
    if (clearError) throw new Error(`Could not clear current theme version: ${clearError.message}`);

    const { error } = await ecommerce.from("app_theme_versions").insert({
      id: crypto.randomUUID(),
      store_id: storeId,
      theme_id: themeId,
      variables,
      fonts,
      is_current: true,
      is_custom: false,
    });
    if (error) throw new Error(`Could not insert app_theme_versions: ${error.message}`);
  }

  console.log(
    `${LOG} theme applied: "${COFFEE_THEME.themeName}" (theme_id=${themeId}, fontPairingId=${fontPairingId ?? "null"}).`,
  );
}

// Upserts the coffee preset in the shared app_themes catalog by theme_name
// (unique). `colors` is the full 10-color light palette so normalizeThemeRecord
// accepts it. is_active stays false: per-store activation is via app_theme_versions.
async function ensureAppTheme(ecommerce) {
  const { data: existing, error: readError } = await ecommerce
    .from("app_themes")
    .select("id")
    .eq("theme_name", COFFEE_THEME.themeName)
    .maybeSingle();
  if (readError) throw new Error(`Could not read app_themes: ${readError.message}`);

  if (existing) {
    const { error } = await ecommerce
      .from("app_themes")
      .update({ colors: COFFEE_COLORS_LIGHT, updated_at: nowIso() })
      .eq("id", existing.id);
    if (error) throw new Error(`Could not update app_themes: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await ecommerce
    .from("app_themes")
    .insert({ theme_name: COFFEE_THEME.themeName, colors: COFFEE_COLORS_LIGHT, is_active: false })
    .select("id")
    .single();
  if (error) throw new Error(`Could not insert app_themes: ${error.message}`);
  return data.id;
}

// Resolves the numeric app_font_pairings.id for a pairing name (stored as a
// string in the theme's fonts jsonb). Returns null if the pairing is absent, so
// the storefront falls back to its default font rather than failing.
async function resolveFontPairingId(ecommerce, pairingName) {
  const { data, error } = await ecommerce
    .from("app_font_pairings")
    .select("id")
    .eq("pairing_name", pairingName)
    .maybeSingle();
  if (error) {
    console.warn(`${LOG} Could not read app_font_pairings (${pairingName}): ${error.message}; using default font.`);
    return null;
  }
  if (!data?.id) {
    console.warn(`${LOG} Font pairing "${pairingName}" not found; using default font.`);
    return null;
  }
  return String(data.id);
}

// ── Small helpers ────────────────────────────────────────────────────────────

function findProduct(slug) {
  const product = PRODUCTS.find((p) => p.slug === slug);
  if (!product) throw new Error(`Unknown product slug in plan: ${slug}`);
  return product;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function nowIso() {
  return new Date().toISOString();
}

// Strong, single-use temporary password. base64url avoids ambiguous symbols; the
// fixed prefix guarantees upper/lower/digit/symbol for any password policy.
function generateTempPassword() {
  return `Cd1!${crypto.randomBytes(24).toString("base64url")}`;
}
