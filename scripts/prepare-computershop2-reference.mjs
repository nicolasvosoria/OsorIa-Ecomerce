#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const DEFAULT_MANIFEST_PATH = 'data/visual-reference/computershop2-manifest.json';
const DEFAULT_DOWNLOAD_DIR = '/tmp/osoria-computershop2-assets';
const ECOMMERCE_SCHEMA = 'ecommerce';

const args = new Set(process.argv.slice(2));
const manifestPath = valueAfter('--manifest') ?? DEFAULT_MANIFEST_PATH;
const downloadDir = valueAfter('--output') ?? DEFAULT_DOWNLOAD_DIR;
const shouldDownload = args.has('--download') || args.has('--apply');
const shouldBackup = args.has('--backup') || args.has('--apply');
const shouldApply = args.has('--apply');
const dryRun = args.has('--dry-run') || !shouldApply;

main().catch((error) => {
  console.error('[computershop2] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const manifest = await readManifest(manifestPath);
  const assetTargets = assetTargetsFromManifest(manifest);

  if (shouldDownload) {
    await downloadAssets({ assets: manifest.assets, assetTargets, downloadDir });
  }

  if (dryRun) {
    printDryRun({ manifest, assetTargets, downloadDir });
    return;
  }

  if (!args.has('--confirm-default-reset')) {
    throw new Error('Refusing to mutate staging/default store without --confirm-default-reset. Run with --backup first and inspect the output.');
  }

  const supabase = createSupabaseClient();
  const ecommerce = supabase.schema(ECOMMERCE_SCHEMA);
  const store = await findDefaultStore(ecommerce, manifest.store.subdomain);
  const backupPath = shouldBackup ? await backupDefaultStore({ ecommerce, store, manifest }) : null;
  const assetUrls = await uploadAssets({ supabase, manifest, assetTargets, downloadDir });

  await resetDefaultStore({ ecommerce, store, componentNames: Object.keys(manifest.componentStyles) });
  const categories = await seedCategories({ ecommerce, store, manifest, assetUrls });
  await seedProducts({ ecommerce, store, manifest, assetUrls, categories });
  await seedComponentStyles({ ecommerce, store, manifest, assetUrls });

  console.log('[computershop2] Default store prepared successfully.');
  if (backupPath) console.log(`[computershop2] Backup written to ${backupPath}`);
}

function valueAfter(flag) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : null;
}

async function readManifest(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function assetTargetsFromManifest(manifest) {
  const prefix = manifest.storage.prefix.replace(/^\/+|\/+$/g, '');
  return new Map(
    manifest.assets.map((asset) => [
      asset.key,
      {
        ...asset,
        storagePath: `${prefix}/${asset.path.replace(/^\/+/, '')}`,
      },
    ]),
  );
}

async function downloadAssets({ assets, assetTargets, downloadDir }) {
  await fs.mkdir(downloadDir, { recursive: true });

  for (const asset of assets) {
    const target = assetTargets.get(asset.key);
    const outputPath = path.join(downloadDir, target.storagePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    const response = await fetch(asset.url);
    if (!response.ok) {
      throw new Error(`Could not download ${asset.url}: ${response.status} ${response.statusText}`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(outputPath, bytes);
    console.log(`[computershop2] downloaded ${asset.key} -> ${outputPath}`);
  }
}

function printDryRun({ manifest, assetTargets, downloadDir }) {
  console.log('[computershop2] Dry run only. No Supabase writes will run.');
  console.log(`[computershop2] Assets: ${assetTargets.size}, products: ${manifest.products.length}, categories: ${manifest.categories.length}`);
  console.log(`[computershop2] Download directory: ${downloadDir}`);
  console.log('[computershop2] Apply command: node scripts/prepare-computershop2-reference.mjs --download --backup --apply --confirm-default-reset');
}

function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for --apply.');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function findDefaultStore(ecommerce, subdomain) {
  const { data, error } = await ecommerce
    .from('stores')
    .select('id, subdomain, store_name')
    .eq('subdomain', subdomain)
    .single();

  if (error || !data) {
    throw new Error(`Could not find ecommerce.stores row for subdomain ${subdomain}: ${error?.message || 'missing row'}`);
  }

  return data;
}

async function backupDefaultStore({ ecommerce, store, manifest }) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join('/tmp', 'osoria-default-store-backups');
  const backupPath = path.join(backupDir, `default-store-${timestamp}.json`);
  await fs.mkdir(backupDir, { recursive: true });

  const [categories, items, componentStyles] = await Promise.all([
    selectAll(ecommerce.from('item_categories').select('*').eq('store_id', store.id)),
    selectAll(ecommerce.from('store_items').select('*').eq('store_id', store.id)),
    selectAll(ecommerce.from('component_styles').select('*').eq('store_id', store.id)),
  ]);
  const itemIds = items.map((item) => item.id);
  const productCombos = await selectAll(ecommerce.from('product_combos').select('*').eq('store_id', store.id));
  const comboIds = productCombos.map((combo) => combo.id);
  const [images, variants, tags, seo, metrics] = itemIds.length > 0
    ? await Promise.all([
        selectAll(ecommerce.from('item_images').select('*').in('item_id', itemIds)),
        selectAll(ecommerce.from('item_variants').select('*').in('item_id', itemIds)),
        selectAll(ecommerce.from('item_tags').select('*').in('item_id', itemIds)),
        selectAll(ecommerce.from('item_seo').select('*').in('item_id', itemIds)),
        selectAll(ecommerce.from('item_metrics').select('*').in('item_id', itemIds)),
      ])
    : [[], [], [], [], []];
  const componentRowsByCombo = comboIds.length > 0
    ? await selectAll(ecommerce.from('product_combo_components').select('*').in('combo_id', comboIds))
    : [];
  const componentRowsByProduct = itemIds.length > 0
    ? await selectAll(ecommerce.from('product_combo_components').select('*').in('product_id', itemIds))
    : [];
  const productComboComponents = uniqueRowsById([
    ...componentRowsByCombo,
    ...componentRowsByProduct,
  ]);

  await fs.writeFile(
    backupPath,
    JSON.stringify({
      reference: manifest.reference,
      store,
      categories,
      items,
      images,
      variants,
      tags,
      seo,
      metrics,
      productCombos,
      productComboComponents,
      componentStyles,
    }, null, 2),
  );
  console.log(`[computershop2] backup -> ${backupPath}`);
  return backupPath;
}

function uniqueRowsById(rows) {
  return Array.from(new Map(rows.map((row) => [row.id, row])).values());
}

async function uploadAssets({ supabase, manifest, assetTargets, downloadDir }) {
  const bucket = supabase.storage.from(manifest.storage.bucket);
  const publicUrls = {};

  for (const asset of manifest.assets) {
    const target = assetTargets.get(asset.key);
    const localPath = path.join(downloadDir, target.storagePath);
    const bytes = await fs.readFile(localPath);
    const { error } = await bucket.upload(target.storagePath, bytes, {
      contentType: contentTypeFor(target.storagePath),
      upsert: true,
    });

    if (error) throw new Error(`Could not upload ${target.storagePath}: ${error.message}`);
    publicUrls[asset.key] = bucket.getPublicUrl(target.storagePath).data.publicUrl;
    console.log(`[computershop2] uploaded ${asset.key} -> ${target.storagePath}`);
  }

  return publicUrls;
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.webp')) return 'image/webp';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

async function resetDefaultStore({ ecommerce, store, componentNames }) {
  const items = await selectAll(ecommerce.from('store_items').select('id').eq('store_id', store.id));
  const productCombos = await selectAll(ecommerce.from('product_combos').select('id').eq('store_id', store.id));
  const itemIds = items.map((item) => item.id);
  const comboIds = productCombos.map((combo) => combo.id);

  if (comboIds.length > 0) {
    await assertOk(
      ecommerce.from('product_combo_components').delete().in('combo_id', comboIds),
      'reset ecommerce.product_combo_components by combo',
    );
    await assertOk(ecommerce.from('product_combos').delete().eq('store_id', store.id), 'reset ecommerce.product_combos');
  }

  if (itemIds.length > 0) {
    await assertOk(
      ecommerce.from('product_combo_components').delete().in('product_id', itemIds),
      'reset ecommerce.product_combo_components by product',
    );
  }

  await assertOk(ecommerce.from('store_items').delete().eq('store_id', store.id), 'reset ecommerce.store_items');
  await assertOk(ecommerce.from('item_categories').delete().eq('store_id', store.id), 'reset ecommerce.item_categories');
  await assertOk(
    ecommerce.from('component_styles').delete().eq('store_id', store.id).in('component_name', componentNames),
    'reset ecommerce.component_styles',
  );
}

async function seedCategories({ ecommerce, store, manifest, assetUrls }) {
  const rows = manifest.categories.map((category) => ({
    store_id: store.id,
    category_name: category.name,
    category_description: category.description,
    category_image_url: assetUrls[category.assetKey],
    display_order: category.displayOrder,
    is_active: true,
  }));
  const { data, error } = await ecommerce
    .from('item_categories')
    .insert(rows)
    .select('id, category_name');

  if (error) throw new Error(`Could not seed ecommerce.item_categories: ${error.message}`);
  return new Map(data.map((category) => [category.category_name, category.id]));
}

async function seedProducts({ ecommerce, store, manifest, assetUrls, categories }) {
  for (const product of manifest.products) {
    const categoryId = categories.get(product.category);
    if (!categoryId) throw new Error(`Missing seeded category ${product.category}`);

    const primaryImageUrl = assetUrls[product.assetKey];
    const { data, error } = await ecommerce
      .from('store_items')
      .insert({
        store_id: store.id,
        item_code: product.sku,
        item_name: product.name,
        item_description: `${product.name} configured from the licensed BeComputerShop2 visual reference for staging parity.`,
        item_description_html: `<p>${product.name} configured from the licensed BeComputerShop2 visual reference for staging parity.</p>`,
        category_id: categoryId,
        base_price: product.basePrice,
        compare_at_price: product.compareAtPrice ?? null,
        currency_code: manifest.store.currencyCode,
        is_active: true,
        is_featured: Boolean(product.featured),
        is_available_for_sale: true,
        track_inventory: false,
        inventory_quantity: 99,
        low_stock_threshold: 5,
        item_slug: product.slug,
        seo_title: product.name,
        seo_description: product.name,
        tags: [product.category.toLowerCase(), 'computershop2-reference'],
        primary_image_url: primaryImageUrl,
        primary_image_alt: product.name,
        display_order: product.displayOrder,
        metadata: { visual_reference: manifest.reference.url, asset_key: product.assetKey },
      })
      .select('id, item_name')
      .single();

    if (error) throw new Error(`Could not seed product ${product.name}: ${error.message}`);
    await assertOk(
      ecommerce.from('item_images').insert({
        item_id: data.id,
        image_url: primaryImageUrl,
        image_alt: product.name,
        display_order: 1,
        image_type: 'product',
      }),
      `seed ecommerce.item_images for ${product.name}`,
    );
  }
}

async function seedComponentStyles({ ecommerce, store, manifest, assetUrls }) {
  const rows = Object.entries(manifest.componentStyles).map(([componentName, variables]) => ({
    store_id: store.id,
    component_name: componentName,
    variables: replaceAssetKeys(variables, assetUrls),
    updated_at: new Date().toISOString(),
  }));

  await assertOk(ecommerce.from('component_styles').insert(rows), 'seed ecommerce.component_styles');
}

function replaceAssetKeys(value, assetUrls) {
  if (Array.isArray(value)) return value.map((item) => replaceAssetKeys(item, assetUrls));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nestedValue]) => {
      if (key.endsWith('AssetKey')) {
        const targetKey = key.slice(0, -'AssetKey'.length);
        return [[targetKey, assetUrls[nestedValue] || nestedValue]];
      }
      return [[key, replaceAssetKeys(nestedValue, assetUrls)]];
    }),
  );
}

async function selectAll(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function assertOk(query, label) {
  const { error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
}
