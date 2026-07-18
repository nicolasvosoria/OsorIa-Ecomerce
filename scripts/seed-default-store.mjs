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
//   - satellite config: store_branding / store_contact / store_commerce_settings
//     / store_seo (+ store_seo_keywords)
//   - catalog: 2 categories, 3 single-origin coffees (2 variants each),
//     item_images, and a "Trilogía" combo bundling the three
//   - product images uploaded to the public `products` bucket
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
  // No coffee-specific logo ships in public/; use the neutral placeholder asset
  // (site-relative path served by Next) rather than borrowing the real Osoria mark.
  logo_url: "/placeholder-logo.svg",
  favicon_url: "/icon.svg",
  primary_color: "#6F4E37", // coffee brown
  secondary_color: "#C9A227", // honey gold
};

const CONTACT = {
  contact_email: "hola@cumbredorada.co",
  contact_phone: "+57 320 000 0000",
  address: "Pitalito, Huila, Colombia",
};

const COMMERCE = {
  tax_rate: 0,
  shipping_enabled: true,
  free_shipping_threshold: 150000,
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
  },
  {
    slug: "combos",
    category_name: "Combos",
    category_description: "Sets y cajas de regalo con nuestros cafés de origen.",
    seo_title: "Combos de café | Cumbre Dorada",
    seo_description: "Sets y regalos con nuestros cafés de origen de Huila.",
    display_order: 2,
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
};

const PRODUCTS = [
  {
    slug: "cafe-honey",
    itemCode: "CAFE-HONEY",
    name: "Café Honey Cumbre Dorada",
    description:
      "Café de proceso honey de Huila: dulzor a panela, notas a frutas de hueso y un final acaramelado. Tostado medio, cultivado a 1.700 msnm.",
    categorySlug: "cafe-de-origen",
    basePrice: 38000,
    tags: ["honey", "single-origin", "huila", "specialty"],
    metadata: { origen: "Huila", altitud_msnm: 1700, proceso: "honey" },
    primaryImageKey: "cafe-honey-primary",
    galleryImageKeys: ["cafe-honey-process", "cafe-honey-454"],
    seoTitle: "Café Honey de Huila | Cumbre Dorada",
    seoDescription:
      "Café honey de origen: dulce, acaramelado y con cuerpo. Tostado artesanal.",
    variants: [
      { code: "CAFE-HONEY-250", peso: "250g", price: 38000, inventory: 60, isDefault: true },
      { code: "CAFE-HONEY-454", peso: "454g", price: 62000, inventory: 35, isDefault: false },
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
      { code: "CAFE-NATURAL-250", peso: "250g", price: 40000, inventory: 55, isDefault: true },
      { code: "CAFE-NATURAL-454", peso: "454g", price: 66000, inventory: 30, isDefault: false },
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
    tags: ["washed", "lavado", "single-origin", "huila", "specialty"],
    metadata: { origen: "Huila", altitud_msnm: 1680, proceso: "lavado" },
    primaryImageKey: "cafe-washed-primary",
    galleryImageKeys: ["cafe-washed-process"],
    seoTitle: "Café Lavado de Huila | Cumbre Dorada",
    seoDescription:
      "Café lavado de origen: taza limpia, acidez cítrica y notas florales.",
    variants: [
      { code: "CAFE-WASHED-250", peso: "250g", price: 36000, inventory: 60, isDefault: true },
      { code: "CAFE-WASHED-454", peso: "454g", price: 60000, inventory: 35, isDefault: false },
    ],
  },
];

const COMBO = {
  slug: "trilogia-cumbre-dorada",
  name: "Trilogía Cumbre Dorada",
  description:
    "La trilogía completa: nuestros tres procesos —honey, natural y lavado— en una caja de regalo. Descubre cómo el proceso transforma el mismo grano de Huila.",
  imageKey: "combo-trilogia",
  discount_type: "percentage", // CHECK: 'percentage' | 'fixed_cop'
  discount_value: 15,
  seo_title: "Trilogía Cumbre Dorada | Caja de regalo de café",
  seo_description:
    "Los tres procesos de Cumbre Dorada en una caja de regalo, con 15% de descuento.",
  // Each component bundles the DEFAULT (250g) variant of one product, qty 1.
  componentProductSlugs: ["cafe-honey", "cafe-natural", "cafe-washed"],
  componentVariantCode: (product) =>
    product.variants.find((v) => v.isDefault)?.code,
};

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
  const categoryIdBySlug = await ensureCategories(ecommerce, storeId);
  const productContext = await ensureProducts(ecommerce, storeId, categoryIdBySlug, imageUrls);
  await ensureCombo(ecommerce, storeId, imageUrls, productContext);

  console.log(
    `${LOG} Done. Store "${STORE.subdomain}" id=${storeId} — ${PRODUCTS.length} products, 1 combo, ${Object.keys(IMAGES).length} images.`,
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
      .map((v) => `${v.peso} $${v.price.toLocaleString("es-CO")} (stock ${v.inventory})`)
      .join(" | ");
    console.log(`${LOG}   - ${product.name} [${product.itemCode}/${product.slug}] cat=${product.categorySlug}`);
    console.log(`${LOG}       base $${product.basePrice.toLocaleString("es-CO")} COP · variants: ${variants}`);
    console.log(`${LOG}       primary=${IMAGES[product.primaryImageKey].file}; gallery=${product.galleryImageKeys.map((k) => IMAGES[k].file).join(", ")}`);
  }

  console.log(
    `${LOG} Combo: ${COMBO.name} [${COMBO.slug}] discount=${COMBO.discount_value} ${COMBO.discount_type} · image=${IMAGES[COMBO.imageKey].file}`,
  );
  console.log(
    `${LOG}   components: ${COMBO.componentProductSlugs.map((slug) => `${slug}@${COMBO.componentVariantCode(findProduct(slug))}`).join(", ")}`,
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
  await upsertByStoreId(ecommerce, "store_commerce_settings", { store_id: storeId, ...COMMERCE });
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

async function ensureCategories(ecommerce, storeId) {
  const idBySlug = {};
  for (const category of CATEGORIES) {
    const { data: existing, error: readError } = await ecommerce
      .from("item_categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("slug", category.slug)
      .maybeSingle();
    if (readError) throw new Error(`Could not read item_categories: ${readError.message}`);

    if (existing) {
      idBySlug[category.slug] = existing.id;
      continue;
    }

    const { data, error } = await ecommerce
      .from("item_categories")
      .insert({
        store_id: storeId,
        slug: category.slug,
        category_name: category.category_name,
        category_description: category.category_description,
        seo_title: category.seo_title,
        seo_description: category.seo_description,
        display_order: category.display_order,
      })
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
      currency_code: STORE.currencyCode,
      is_active: true,
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
      variant_options: { peso: variant.peso },
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

// ── Catalog: combo ───────────────────────────────────────────────────────────

async function ensureCombo(ecommerce, storeId, imageUrls, productContext) {
  const comboFields = {
    name: COMBO.name,
    description: COMBO.description,
    image_url: imageUrls[COMBO.imageKey],
    is_active: true,
    discount_type: COMBO.discount_type,
    discount_value: COMBO.discount_value,
    seo_title: COMBO.seo_title,
    seo_description: COMBO.seo_description,
    updated_at: nowIso(),
  };

  const { data: existing, error: readError } = await ecommerce
    .from("product_combos")
    .select("id")
    .eq("store_id", storeId)
    .eq("slug", COMBO.slug)
    .maybeSingle();
  if (readError) throw new Error(`Could not read product_combos: ${readError.message}`);

  let comboId = existing?.id;
  if (comboId) {
    const { error } = await ecommerce.from("product_combos").update(comboFields).eq("id", comboId);
    if (error) throw new Error(`Could not update product_combos: ${error.message}`);
  } else {
    const { data, error } = await ecommerce
      .from("product_combos")
      .insert({ store_id: storeId, slug: COMBO.slug, ...comboFields })
      .select("id")
      .single();
    if (error) throw new Error(`Could not insert product_combos: ${error.message}`);
    comboId = data.id;
  }

  await ensureComboComponents(ecommerce, comboId, productContext);
  console.log(`${LOG} combo ensured: ${COMBO.slug} (${COMBO.componentProductSlugs.length} components).`);
}

async function ensureComboComponents(ecommerce, comboId, productContext) {
  const rows = COMBO.componentProductSlugs.map((slug, index) => {
    const product = findProduct(slug);
    const variantCode = COMBO.componentVariantCode(product);
    const productId = productContext.idBySlug[slug];
    const variantId = productContext.variantIdByCode[slug][variantCode];
    if (!productId || !variantId) {
      throw new Error(`Combo component ${slug} is missing its product/variant id.`);
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
  if (error) throw new Error(`Could not upsert product_combo_components: ${error.message}`);
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
