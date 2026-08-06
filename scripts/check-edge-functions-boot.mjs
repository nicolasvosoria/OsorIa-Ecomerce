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
// do with module resolution.
//
// Despite this npm script's own name (kept as `supabase:verify:functions-
// boot` because that is the exact command this task's own verification bar
// names -- renaming it would just move the overclaim, not fix it): this
// proves ONLY that every static import resolves to a real file under EACH
// function's OWN deno.json (`<function>/deno.json`, never a shared
// supabase/functions/deno.json -- the Supabase CLI (v2.95.3+) only
// auto-discovers a deno.json that sits in the SAME DIRECTORY as the
// entrypoint; a shared root-level one is silently NOT picked up at deploy
// time, which is exactly what shipped auth-email-hook to staging with the
// classic JSX transform instead of the automatic one -- see
// docs/supabase/email-outbox-runbook.md). Passing that resolution check --
// or even getting a live HTTP response back from `supabase functions serve`
// -- does NOT prove the function boots inside the actual edge-runtime, and
// booting does NOT prove any particular code path was ever exercised: a
// request that 401s on a bad signature, or 500s on a missing secret, still
// "boots" the function without ever reaching lib/email/render.tsx's JSX.
// That gap is real and shipped a broken auth-email-hook past this check,
// past a live `supabase functions serve` + curl, and past every Vitest
// suite (none of which ever asks Deno to render anything) -- only
// `pnpm supabase:verify:functions-render` (scripts/check-edge-functions-
// render.mjs), which drives a real signed request all the way to a
// persisted rendered email, closes that gap. This script needs only the
// `deno` binary, so it runs in CI without Docker; functions-render needs
// Docker (a real `supabase functions serve`) and is slower, which is why
// they stay two separate checks instead of one.
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const FUNCTIONS_DIR = "supabase/functions";

function findEntrypoints() {
  return readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(FUNCTIONS_DIR, entry.name, "index.ts"))
    .filter((entrypointPath) => existsSync(entrypointPath));
}

function resolveGraph(entrypointPath) {
  const configPath = join(entrypointPath, "..", "deno.json");
  // --no-lock: this check's only job is graph resolution, never version
  // pinning -- it must never write to a function's deno.lock. auth-email-
  // hook's lockfile is hand-trimmed of a "workspace" section that `deno
  // info` (with no --no-lock) silently re-adds whenever a package.json
  // sits next to the deno.json, which the real edge-runtime's older Deno
  // version cannot parse (see docs/supabase/email-outbox-runbook.md) --
  // this flag is what keeps a routine verify run from corrupting it back
  // into a boot-breaking state.
  const result = spawnSync("deno", ["info", "--no-lock", "--json", "--config", configPath, entrypointPath], {
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
if (allResolved) {
  console.log("Module resolution OK -- this does NOT prove the functions boot or render anything under the real edge-runtime. See pnpm supabase:verify:functions-render for that.");
}
process.exit(allResolved ? 0 : 1);
