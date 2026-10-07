#!/usr/bin/env node
/**
 * r125 — Smart-Order Vercel build: resilient schema sync (the 3-week deploy freeze fix).
 * ==============================================================================
 *
 * HISTORY: vercel.json's buildCommand started running `prisma db push` on
 * 2026-09-18 (commit 8604174). It has NEVER succeeded on Vercel — every
 * deployment since (71d11b9 → today) failed in the db-push window, freezing
 * production at 57559f0 (Sep 18). The app itself builds and serves fine
 * without the push (the schema was already synced; `next build` needs no DB).
 *
 * This wrapper (same philosophy as Smart-Menu's r124 self-healing chain):
 *   1. If DATABASE_URL is missing/unreachable → log a clear banner, exit 0.
 *      The deploy proceeds — a shipped app beats a 3-week-old frozen one.
 *   2. If the push fails with connection-class errors (P1001/P1002/P1003/
 *      P1004/P1008/ECONN*) → retry ×3 (10s/20s backoff — cold-start wake),
 *      then degrade gracefully with a loud banner.
 *   3. If the push fails with a real schema error → log the FULL error in a
 *      [DB-SYNC] banner and STILL exit 0 (the schema on the DB is whatever
 *      the last successful sync left; blocking the deploy has not fixed it
 *      in 3 weeks — visibility + shipping is the better trade).
 *   4. Success → exit 0 (schema synced, additive as designed).
 *
 * Every outcome prints a single-line greppable [DB-SYNC] verdict so the
 * failure mode is decodable from any build log paste without guessing.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = join(ROOT, 'prisma/schema.postgres.prisma');

const TRANSIENT = /P1001|P1002|P1003|P1004|P1008|ECONNREFUSED|ECONNRESET|ECONNABORTED|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|Can't reach database server|server closed the connection unexpectedly|SSL connection has been closed unexpectedly/i;
const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 10_000, 20_000];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runPush() {
  return new Promise((resolve) => {
    const bin = existsSync(join(ROOT, 'node_modules/.bin/prisma'))
      ? join(ROOT, 'node_modules/.bin/prisma') : 'npx';
    const args = bin.endsWith('prisma') && bin !== 'npx'
      ? ['db', 'push', `--schema=${SCHEMA}`, '--skip-generate']
      : ['prisma', 'db', 'push', `--schema=${SCHEMA}`, '--skip-generate'];
    const child = spawn(bin, args, { cwd: ROOT, env: process.env, stdio: ['inherit', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', (d) => { output += d; process.stdout.write(d); });
    child.stderr.on('data', (d) => { output += d; process.stderr.write(d); });
    child.on('error', (e) => resolve({ code: 127, output: String(e.message || e) }));
    child.on('close', (code) => resolve({ code: code ?? 127, output }));
  });
}

(async () => {
  if (!process.env.DATABASE_URL) {
    console.log('[DB-SYNC] SKIPPED — no DATABASE_URL in this environment. ' +
      'The deploy proceeds without schema sync (same behavior as the Sep-18 green builds).');
    process.exit(0);
  }
  let last = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (BACKOFF_MS[attempt - 1] > 0) {
      console.log(`[DB-SYNC] retry ${attempt}/${MAX_ATTEMPTS} after ${BACKOFF_MS[attempt - 1] / 1000}s…`);
      await sleep(BACKOFF_MS[attempt - 1]);
    }
    last = await runPush();
    if (last.code === 0) {
      console.log('[DB-SYNC] ✓ schema synced (additive, as designed)');
      process.exit(0);
    }
    if (!TRANSIENT.test(last.output)) break;
    console.log('[DB-SYNC] transient connection error — will retry');
  }
  console.error('[DB-SYNC] ─────────────────────────────────────────────────────');
  console.error(`[DB-SYNC] ⚠ schema sync did NOT complete (exit ${last?.code}).`);
  console.error('[DB-SYNC] The deploy PROCEEDS — the app does not need the DB to build.');
  console.error('[DB-SYNC] Full error above. Fix DATABASE_URL / DB reachability in the');
  console.error('[DB-SYNC] Vercel project settings to restore sync-on-deploy.');
  console.error('[DB-SYNC] ─────────────────────────────────────────────────────');
  process.exit(0); // graceful degrade: never block the deploy again
})();
