#!/usr/bin/env node
// The execution-coverage companion to supabase:verify:functions-boot: that
// script only proves every static import in supabase/functions/*/index.ts
// resolves to a real file (`deno info`, module graph only) -- it has NEVER
// proven the function actually RUNS, let alone that lib/email/render.tsx's
// JSX renders correctly under Deno. That gap is exactly what shipped a
// working `deno info`/boot-check pair to staging while auth-email-hook
// crashed on every real request with `ReferenceError: React is not defined`
// (classic JSX transform, no `React` in scope -- see supabase/functions/
// auth-email-hook/deno.json and docs/supabase/email-outbox-runbook.md for
// the fix): the boot check never rendered anything, and `supabase functions
// serve` + an unsigned/wrong-secret request always died on the 401/500
// BEFORE reaching renderEmail() either.
//
// This script closes THAT gap by driving one real signed Standard Webhooks
// request through the ACTUAL auth-email-hook function running under the
// real Supabase Edge Runtime (`supabase functions serve`, the same
// edge-runtime build `supabase functions deploy` ships, not just the `deno`
// CLI) all the way to a persisted, non-empty rendered email in
// ecommerce.email_outbox -- the first thing in this repo to ever ask Deno to
// render anything. A plain `deno run` of a standalone script that imports
// lib/email/render.tsx directly was tried first and rejected: it reproduces
// the ORIGINAL `ReferenceError: React is not defined` exactly, which is
// useful for that one defect, but going through the real edge-runtime is
// what proves rendering end to end (the deploy-time bundler and the plain
// `deno` CLI resolve npm dependencies via different code paths, confirmed
// locally -- see docs/supabase/email-outbox-runbook.md).
//
// What this DOES prove: whether a real Standard-Webhooks-signed request
// reaches renderEmail() under the real edge-runtime and produces non-empty
// HTML/text that lands in ecommerce.email_outbox. What it does NOT prove:
// that `supabase functions deploy` will pick THIS exact deno.json at deploy
// time (that's the resolution rule itself -- ShouldUseDenoJsonDiscovery in
// the CLI's bundler, a separate concern from whether render succeeds once a
// config IS picked up) -- nor that the real project's edge-runtime version
// behaves identically to whatever this machine's Docker image pins.
//
// This check also guards a SECOND defect it originally surfaced:
// @react-email/render's react-dom peer dependency used to resolve
// independently of this repo's own react pin (nothing in lib/email/*
// imports the bare "react-dom" specifier directly, so a plain deno.json
// `imports` entry for it is never walked) and could land on a react-dom
// patch that does not match the exact react patch pinned alongside it,
// which react-dom's own `ensureCorrectIsomorphicReactVersion` rejects at
// render time. Fixed by supabase/functions/auth-email-hook/package.json's
// `overrides` (Deno's own documented mechanism for forcing a version across
// the WHOLE npm dependency graph, including nested peers -- a plain
// deno.json import-map entry cannot reach a peer nothing of ours imports
// directly) plus a checked-in deno.lock that freezes the result, so a cold
// build can't silently re-resolve to a mismatched pair again. See
// docs/supabase/email-outbox-runbook.md for the full investigation,
// including why that deno.lock is hand-trimmed of its "workspace" section.
//
// Preconditions, same as supabase:verify/supabase:verify:email: `supabase
// start` already running (Postgres reachable on 127.0.0.1:54322, Docker).
// This script always force-removes and respawns the local edge-runtime
// container itself (never reuses whatever a developer's own long-running
// `functions serve` session happens to be configured with) so it always
// knows the exact AUTH_EMAIL_HOOK_SECRET it just signed the request with,
// and so there is no window where an old container answering on the same
// port is mistaken for the freshly-configured one.
import { randomBytes, randomUUID, createHash, createHmac } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const FUNCTIONS_BASE_URL = "http://127.0.0.1:54321/functions/v1";
const READY_TIMEOUT_MS = 60_000;
const READY_POLL_INTERVAL_MS = 1_000;

class CheckFailure extends Error {}

function psql(sql, { tuplesOnly = true } = {}) {
  const args = tuplesOnly ? [DB_URL, "-v", "ON_ERROR_STOP=1", "-tAc", sql] : [DB_URL, "-v", "ON_ERROR_STOP=1", "-c", sql];

  const result = spawnSync("psql", args, { encoding: "utf8" });
  if (result.error?.code === "ENOENT") {
    throw new CheckFailure("psql is not installed or not on PATH.");
  }
  if (result.status !== 0) {
    throw new CheckFailure(`psql failed:\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function edgeRuntimeContainerName() {
  const configToml = readFileSync("supabase/config.toml", "utf8");
  const projectId = configToml.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
  if (!projectId) {
    throw new CheckFailure("Could not read project_id from supabase/config.toml.");
  }
  return `supabase_edge_runtime_${projectId}`;
}

function signStandardWebhook(rawBody, id, timestamp, secret) {
  const secretBytes = Buffer.from(secret.slice("whsec_".length), "base64");
  const signature = createHmac("sha256", secretBytes).update(`${id}.${timestamp}.${rawBody}`).digest("base64");
  return `v1,${signature}`;
}

async function waitUntilServing() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  for (;;) {
    try {
      // Kong (the gateway) comes up before the edge-runtime worker has
      // actually finished bundling/resolving this function's dependencies
      // on its first invocation against a cold cache -- Kong itself answers
      // (no connection error) but with a 502 until that first bundle
      // completes. Only a non-502 response (401/500/200, an answer from the
      // FUNCTION itself, not from Kong on its behalf) means it is truly
      // ready; treating any response as ready caused this check to race a
      // cold start and fail on an empty Docker volume.
      const response = await fetch(`${FUNCTIONS_BASE_URL}/auth-email-hook`, { method: "POST", body: "{}" });
      if (response.status !== 502) return;
    } catch {
      // connection refused -- Kong itself isn't even up yet, keep polling.
    }
    if (Date.now() > deadline) {
      throw new CheckFailure(
        `Timed out waiting for ${FUNCTIONS_BASE_URL}/auth-email-hook to accept connections. Is \`supabase start\` running (Docker)? (pnpm supabase:start)`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, READY_POLL_INTERVAL_MS));
  }
}

async function startFunctionsServe(envFile) {
  // Force-remove any previously running edge-runtime container first: a
  // hot "replace" (spawning `functions serve` again while an old one is
  // still up) has an observed window where the OLD container still answers
  // on the same port with the OLD secret while the new one is starting,
  // which made this check flaky (signature_mismatch against the freshly
  // generated secret). Starting from a guaranteed-clean slate removes that
  // race instead of papering over it with a longer poll.
  spawnSync("docker", ["rm", "-f", edgeRuntimeContainerName()], { stdio: "ignore" });

  const serve = spawn("supabase", ["functions", "serve", "--env-file", envFile], {
    stdio: "ignore",
    detached: true,
  });
  const spawnError = await new Promise((resolve) => {
    serve.once("spawn", () => resolve(null));
    serve.once("error", (error) => resolve(error));
  });
  if (spawnError) {
    if (spawnError.code === "ENOENT") {
      throw new CheckFailure("supabase CLI is not installed or not on PATH.");
    }
    throw spawnError;
  }
  serve.unref();
}

async function main() {
  const secret = `whsec_${randomBytes(32).toString("base64")}`;
  const envDir = mkdtempSync(join(tmpdir(), "osoria-functions-render-"));
  const envFile = join(envDir, "functions-serve.env");
  let storeId = null;

  try {
    writeFileSync(envFile, `AUTH_EMAIL_HOOK_SECRET=${secret}\n`);

    console.log("Starting `supabase functions serve` with a throwaway local secret...");
    await startFunctionsServe(envFile);
    await waitUntilServing();
    console.log("auth-email-hook is accepting connections.");

    storeId = psql(`
      with ins as (
        insert into ecommerce.stores (subdomain, store_name)
        values ('render-check-${randomBytes(4).toString("hex")}', 'Render Check Store')
        returning id
      )
      select id from ins;
    `);

    const rawIntentToken = randomBytes(16).toString("hex");
    const tokenHash = createHash("sha256").update(rawIntentToken).digest("hex");
    psql(
      `insert into ecommerce.auth_intents (store_id, purpose, email, token_hash, expires_at)
       values ('${storeId}', 'signup', 'render-check@example.com', '${tokenHash}', now() + interval '1 hour');`,
      { tuplesOnly: false },
    );

    const webhookId = `render-check-${randomUUID()}`;
    const payload = {
      user: { id: randomUUID(), email: "render-check@example.com", user_metadata: { first_name: "Render" } },
      email_data: {
        token_hash: "gotrue-otp-hash-unused-by-signup-path",
        redirect_to: `https://render-check.osoria.help/auth/callback?intent=${rawIntentToken}`,
        email_action_type: "signup",
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = signStandardWebhook(rawBody, webhookId, timestamp, secret);

    const response = await fetch(`${FUNCTIONS_BASE_URL}/auth-email-hook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "webhook-id": webhookId,
        "webhook-timestamp": timestamp,
        "webhook-signature": signature,
      },
      body: rawBody,
    });

    if (response.status !== 200) {
      throw new CheckFailure(`auth-email-hook returned ${response.status}: ${await response.text()}`);
    }

    const idempotencyKey = `auth-hook:${webhookId}`;
    const row = psql(`
      select subject || '|' || length(html_body) || '|' || length(text_body)
      from ecommerce.email_outbox
      where idempotency_key = '${idempotencyKey}';
    `);

    if (!row) {
      throw new CheckFailure("auth-email-hook returned 200 but no row landed in ecommerce.email_outbox.");
    }

    const [subject, htmlLength, textLength] = row.split("|");
    if (Number(htmlLength) === 0 || Number(textLength) === 0) {
      throw new CheckFailure(`Rendered email has empty body (html=${htmlLength} chars, text=${textLength} chars).`);
    }

    console.log(`Rendered through the real edge-runtime: subject="${subject}", html=${htmlLength} chars, text=${textLength} chars.`);
    console.log("supabase:verify:functions-render: OK");
  } finally {
    if (storeId) {
      psql(`delete from ecommerce.stores where id = '${storeId}';`, { tuplesOnly: false });
    }
    rmSync(envDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof CheckFailure ? error.message : error);
  process.exitCode = 1;
});
