#!/usr/bin/env node
// The Deno-module-resolution companion to supabase:verify(:email): those
// prove the SQL/PostgREST boundary against real Postgres; this proves the
// OTHER boundary a slice-5 verifier caught for free -- every module
// statically reachable from a supabase/functions/*/index.ts entrypoint must
// resolve under Deno's own extension-strict module graph, the exact class of
// defect that let lib/email/outbox-worker.ts ship a missing ".ts" past
// lint, typecheck, and thousands of passing Vitest tests, none of which ever
// asks Deno to resolve anything.
//
// `deno info --json` (graph resolution only), deliberately never
// `deno check`: both Edge entrypoints carry pre-existing TypeScript errors
// from calling supabase-js's `createClient()` without the project's
// `Database` generic (a real but separate gap, unrelated to booting) --
// rolling those into this gate would fail it for reasons having nothing to
// do with module resolution. This proves ONLY that every static import
// resolves to a real file; it does NOT prove the function boots inside the
// actual edge-runtime (env wiring, runtime-only Deno APIs, npm resolution
// quirks specific to that runtime's Deno version) -- `supabase functions
// serve` plus a real request is what proves that, and needs Docker. This
// script needs only the `deno` binary, so it runs in CI without Docker.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const FUNCTIONS_DIR = "supabase/functions";
const CONFIG_PATH = join(FUNCTIONS_DIR, "deno.json");

function findEntrypoints() {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(FUNCTIONS_DIR, entry.name, "index.ts"))
    .filter((entrypointPath) => existsSync(entrypointPath));
}

function resolveGraph(entrypointPath) {
  const result = spawnSync("deno", ["info", "--json", "--config", CONFIG_PATH, entrypointPath], {
    encoding: "utf8",
  });

  if (result.error?.code === "ENOENT") {
    console.error("deno is not installed or not on PATH -- install it to run this check (https://deno.com).");
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${entrypointPath}: deno info itself failed:`);
    console.error(result.stderr || result.stdout);
    return { entrypointPath, unresolved: null };
  }

  const graph = JSON.parse(result.stdout);
  const unresolved = (graph.modules ?? []).filter((module) => module.error);
  return { entrypointPath, unresolved };
}

function report({ entrypointPath, unresolved }) {
  if (unresolved === null) {
    return false;
  }

  if (unresolved.length === 0) {
    console.log(`${entrypointPath}: OK`);
    return true;
  }

  console.error(`${entrypointPath}: ${unresolved.length} module(s) failed to resolve`);
  unresolved.forEach((module) => console.error(`  ${module.specifier}: ${module.error}`));
  return false;
}

const entrypoints = findEntrypoints();
if (entrypoints.length === 0) {
  console.error(`No ${FUNCTIONS_DIR}/*/index.ts entrypoints found.`);
  process.exit(1);
}

const allResolved = entrypoints.map(resolveGraph).map(report).every(Boolean);
process.exit(allResolved ? 0 : 1);
