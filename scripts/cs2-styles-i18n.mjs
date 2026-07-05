// Careful, scoped helper to read/backup/translate ecommerce.component_styles
// for the default store. NEVER touches the public schema: every query goes
// through supabase.schema('ecommerce'). Two modes:
//   --read   : read all component_styles rows for the default store, write a
//              timestamped backup JSON, print component_name + variables.
//   --apply  : merge Spanish text values into existing variables (preserving
//              every other key) and update each row. Requires --read first.
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, writeFileSync } from "node:fs";

const ECOMMERCE_SCHEMA = "ecommerce";
const DEFAULT_SUBDOMAIN = "default";
const BACKUP_DIR = "/tmp/osoria-styles-backup";
const MODE = process.argv.includes("--apply") ? "apply" : "read";

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY in env.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

async function findDefaultStore(ecommerce) {
  const { data, error } = await ecommerce
    .from("stores")
    .select("id, subdomain, store_name")
    .eq("subdomain", DEFAULT_SUBDOMAIN)
    .maybeSingle();
  if (error || !data) {
    throw new Error(
      `Could not find ecommerce.stores row for subdomain "${DEFAULT_SUBDOMAIN}": ${error?.message || "missing row"}`,
    );
  }
  return data;
}

// Spanish overrides per component_name. We only set TEXT keys; colors, layout,
// images, asset keys, products arrays, etc. are intentionally NOT listed so the
// existing values are preserved by the shallow merge below.
const SPANISH = {
  products: {
    eyebrow: "Electrónica",
    title: "Productos populares",
    description:
      "Descubrí los productos más buscados, seleccionados de nuestro catálogo destacado.",
  },
  popular: {
    title: "Lo más vendido",
    priceLabel: "Desde $29.000",
  },
  featured: {
    title: "¡Por favor, no detengas la música!",
    subtitle: "La elección de los usuarios esta semana",
    linkText: "Ver todos los productos",
  },
  specialOffer: {
    eyebrow: "Electrónica",
    title: "Oferta Especial",
    description:
      "Una oferta por tiempo limitado configurada como referencia visual para paridad de staging.",
    claimedLabel: "Ya reclamado 32%",
    countdownLabel: "La oferta termina en:",
    linkText: "Comprar Ahora",
  },
  whyus: {
    title: "¿Por qué nosotros?",
  },
  newsletter: {
    title: "Unite a Nuestro Newsletter",
    description:
      "Recibí lanzamientos de productos, ofertas exclusivas y un 10% de descuento en tu próxima compra.",
    discountText: "Obtené un 10% de descuento en tu próxima compra",
    emailPlaceholder: "Correo electrónico",
    buttonText: "Suscribirse",
  },
};

async function main() {
  const supabase = getClient();
  const ecommerce = supabase.schema(ECOMMERCE_SCHEMA);
  const store = await findDefaultStore(ecommerce);
  console.log(`Default store: ${store.store_name} (id=${store.id})`);

  const { data: rows, error } = await ecommerce
    .from("component_styles")
    .select("id, component_name, variables")
    .eq("store_id", store.id);
  if (error) throw new Error(`read component_styles: ${error.message}`);

  mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = `${BACKUP_DIR}/component-styles-${stamp}.json`;
  writeFileSync(backupPath, JSON.stringify({ store, rows }, null, 2));
  console.log(`Backup written: ${backupPath}`);
  console.log(`Rows: ${rows.length}\n`);

  for (const row of rows) {
    const keys = Object.keys(row.variables || {});
    const textPreview = {};
    for (const k of keys) {
      const v = row.variables[k];
      if (typeof v === "string" && !v.startsWith("var(") && !v.startsWith("#")) {
        textPreview[k] = v;
      }
    }
    console.log(`[${row.component_name}] keys: ${keys.join(", ")}`);
    console.log(`   text values:`, JSON.stringify(textPreview));
  }

  if (MODE === "read") {
    console.log("\nREAD-ONLY mode. No writes performed.");
    return;
  }

  console.log("\n=== APPLY mode: merging Spanish text values ===");
  let updated = 0;
  for (const row of rows) {
    const overrides = SPANISH[row.component_name];
    if (!overrides) continue;
    // Only override keys that actually exist on the saved row (so we don't
    // invent new keys the component doesn't read), and only when the value
    // actually changes.
    const merged = { ...row.variables };
    const changedKeys = [];
    for (const [k, val] of Object.entries(overrides)) {
      if (k in merged && merged[k] !== val) {
        merged[k] = val;
        changedKeys.push(k);
      } else if (!(k in merged)) {
        // Key not present in saved row: add it so the Spanish copy shows.
        merged[k] = val;
        changedKeys.push(`${k}(new)`);
      }
    }
    if (changedKeys.length === 0) {
      console.log(`[${row.component_name}] no changes`);
      continue;
    }
    const { error: upErr } = await ecommerce
      .from("component_styles")
      .update({ variables: merged })
      .eq("id", row.id)
      .eq("store_id", store.id);
    if (upErr) throw new Error(`update ${row.component_name}: ${upErr.message}`);
    updated++;
    console.log(`[${row.component_name}] updated: ${changedKeys.join(", ")}`);
  }
  console.log(`\nDone. ${updated} row(s) updated.`);
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
