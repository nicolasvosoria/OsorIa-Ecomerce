# BeComputerShop2 staging reference import

This project uses the BeComputerShop2 reference as licensed staging/default-store data, not as hardcoded React content.

## Safety rules

- Use only the `ecommerce` schema for catalog/config data.
- Do not run old scripts that write to `public.store_items`, `public.item_images`, or other `public` tables.
- Always create and inspect a backup before applying a default-store reset.
- Assets are downloaded locally and uploaded to the `products` Storage bucket under `visual-reference/computershop2/*`.

## Dry run and asset download

```bash
node scripts/prepare-computershop2-reference.mjs --download --dry-run
```

Downloaded files go to `/tmp/osoria-computershop2-assets` by default. To change it:

```bash
node scripts/prepare-computershop2-reference.mjs --download --dry-run --output /tmp/osoria-cs2
```

## Backup + apply to staging/default store

Requires Supabase env vars in the shell running the command:

- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY`

```bash
node scripts/prepare-computershop2-reference.mjs --download --backup --apply --confirm-default-reset
```

The backup is written to `/tmp/osoria-default-store-backups/default-store-<timestamp>.json`.

## Default store baseline (current live look)

`data/default-store-baseline.json` captures the CURRENT live `component_styles`
of the default store (all 10 sections, Spanish copy, real product ids). It
supersedes the `componentStyles` block of `computershop2-manifest.json` above
for the default store: the manifest is the original English 7-section
reference used to bootstrap the store; the baseline is the desired
reproducible result after manual edits and i18n.

```bash
# Dry run (no DB access)
node scripts/apply-default-store-baseline.mjs

# Apply (requires the same Supabase env vars as above)
node scripts/apply-default-store-baseline.mjs --apply --confirm
```

The apply script only UPSERTs the 10 baseline rows for the default store by
`(store_id, component_name)` — it never deletes rows and never touches other
stores.
