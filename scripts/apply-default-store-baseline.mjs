#!/usr/bin/env node
// Applies data/default-store-baseline.json to ecommerce.component_styles for
// the default store. This baseline is the CURRENT live look of the default
// store (10 sections, Spanish copy, real product ids) and supersedes the
// componentStyles block of data/visual-reference/computershop2-manifest.json
// (English, 7 sections, *AssetKey placeholders) for that store.
//
// UPSERTs by (store_id, component_name): inserts missing rows, updates
// existing ones. Non-destructive — never deletes component_styles rows, even
// for component_names outside the baseline. Only ever touches the row(s) for
// the resolved default store. Re-running is a no-op once applied.
//
// Dry run (default, no DB access required):
//   node scripts/apply-default-store-baseline.mjs
//
// Apply against the database (requires NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL
// and SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_KEY):
//   node scripts/apply-default-store-baseline.mjs --apply --confirm
import fs from "node:fs/promises";
import process from "node:process";

const BASELINE_PATH = "data/default-store-baseline.json";
const ECOMMERCE_SCHEMA = "ecommerce";

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply") && args.has("--confirm");

main().catch((error) => {
  console.error("[default-store-baseline] Failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const baseline = await readBaseline(BASELINE_PATH);
  const componentNames = Object.keys(baseline.componentStyles);

  if (!shouldApply) {
    printDryRun({ baseline, componentNames });
    return;
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createSupabaseClient(createClient);
  const ecommerce = supabase.schema(ECOMMERCE_SCHEMA);
  const store = await findDefaultStore(ecommerce, baseline.store.subdomain);

  await upsertComponentStyles({ ecommerce, store, baseline });

  console.log(`[default-store-baseline] Applied ${componentNames.length} component_styles row(s) for store "${store.subdomain}" (id=${store.id}).`);
}

async function readBaseline(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

function printDryRun({ baseline, componentNames }) {
  console.log("[default-store-baseline] Dry run only. No Supabase writes will run.");
  console.log(`[default-store-baseline] Store subdomain: ${baseline.store.subdomain}`);
  console.log(`[default-store-baseline] Components (${componentNames.length}): ${componentNames.join(", ")}`);
  console.log("[default-store-baseline] Apply command: node scripts/apply-default-store-baseline.mjs --apply --confirm");
}

function createSupabaseClient(createClient) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findDefaultStore(ecommerce, subdomain) {
  const { data, error } = await ecommerce
    .from("stores")
    .select("id, subdomain, store_name")
    .eq("subdomain", subdomain)
    .single();

  if (error || !data) {
    throw new Error(`Could not find ecommerce.stores row for subdomain "${subdomain}": ${error?.message || "missing row"}`);
  }

  return data;
}

async function upsertComponentStyles({ ecommerce, store, baseline }) {
  const { data: existingRows, error: readError } = await ecommerce
    .from("component_styles")
    .select("id, component_name")
    .eq("store_id", store.id);

  if (readError) throw new Error(`Could not read ecommerce.component_styles: ${readError.message}`);

  const existingIdByComponentName = new Map(existingRows.map((row) => [row.component_name, row.id]));

  for (const [componentName, variables] of Object.entries(baseline.componentStyles)) {
    const existingId = existingIdByComponentName.get(componentName);

    if (existingId) {
      const { error } = await ecommerce
        .from("component_styles")
        .update({ variables, updated_at: new Date().toISOString() })
        .eq("id", existingId)
        .eq("store_id", store.id);
      if (error) throw new Error(`Could not update component_styles for "${componentName}": ${error.message}`);
      console.log(`[default-store-baseline] updated ${componentName}`);
      continue;
    }

    const { error } = await ecommerce.from("component_styles").insert({
      store_id: store.id,
      component_name: componentName,
      variables,
    });
    if (error) throw new Error(`Could not insert component_styles for "${componentName}": ${error.message}`);
    console.log(`[default-store-baseline] inserted ${componentName}`);
  }
}
