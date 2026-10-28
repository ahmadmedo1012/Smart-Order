// P30-A (§6 deploy-seed safety) — the isolation wiring pins.
//
// WHAT THIS PINS (source-contract — the tx-contract.test.ts /
// seed-secret.test.ts precedent: the route/script wires next/server +
// Prisma + env vars, so dependency-free node:test pins the WIRING; the
// behavioral seam (RESERVED) is pinned in slug.test.ts; the happy-path
// idempotent seeding is exercised by the CI e2e battery on the
// dedicated e2e.db):
//
//   1. OWNERSHIP GUARD — both seed twins (scripts/seed-family.js +
//      api/seed/route.ts) verify that the row at slug «demo-store»
//      carries the demo identity (the shared DEMO_STORE_NAME) before
//      any product-photo refresh / payment-method / delivery-zone
//      mutation. A merchant row at that slug makes every demo mutation
//      skip loudly (script: banner + explicit skip; route: 409, zero
//      data touched).
//   2. PREVIEW GATE — both deploy-chain mutation steps
//      (vercel-db-sync.mjs schema push + seed-family.js demo seed)
//      structurally skip on VERCEL_ENV=preview unless explicitly opted
//      in (DB_ALLOW_PREVIEW=1 / SEED_ALLOW_PREVIEW=1 for a genuinely
//      dedicated preview database). Production builds
//      (VERCEL_ENV=production) and local/CI runs (no VERCEL_ENV) stay
//      ungated — the P29-C3 deploy behavior is preserved exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const SEED_FAMILY = read("../../scripts/seed-family.js");
const SEED_ROUTE = read("../../src/app/api/seed/route.ts");
const DB_SYNC = read("../../scripts/vercel-db-sync.mjs");
const SLUG_LIB = read("../../src/lib/slug.ts");

test("ownership guard: seed-family verifies the demo identity before mutating", () => {
  assert.ok(
    SEED_FAMILY.includes("demo.name !== DEMO_STORE_NAME"),
    "the else-if ownership branch exists",
  );
  assert.ok(
    SEED_FAMILY.includes("return { demoSkipped: true }"),
    "the skip is an explicit result, never a silent fall-through",
  );
  assert.ok(
    !SEED_FAMILY.includes('name: "مخبز الواحة — تجريبي"'),
    "the create path uses the constant, not a second copy of the identity",
  );
});

test("ownership guard: /api/seed refuses a non-demo row at the slug (409, no mutation)", () => {
  assert.ok(
    SEED_ROUTE.includes("demo.name !== DEMO_STORE_NAME"),
    "the route ownership branch exists",
  );
  assert.ok(SEED_ROUTE.includes("409"), "conflict status, not silent success");
  assert.ok(
    SEED_ROUTE.includes("مشغول بمتجر غير تجريبي"),
    "the refusal states the slug is occupied by a non-demo store",
  );
});

test("ownership guard: both twins share ONE demo identity constant", () => {
  const identity = 'const DEMO_STORE_NAME = "مخبز الواحة — تجريبي"';
  assert.ok(SEED_FAMILY.includes(identity), "seed-family carries the constant");
  assert.ok(SEED_ROUTE.includes(identity), "the route carries the same constant");
});

test("preview gate: seed-family skips on VERCEL_ENV=preview (SEED_ALLOW_PREVIEW opt-in)", () => {
  assert.ok(
    SEED_FAMILY.includes('process.env.VERCEL_ENV === "preview"'),
    "the gate tests VERCEL_ENV=preview",
  );
  assert.ok(
    SEED_FAMILY.includes('process.env.SEED_ALLOW_PREVIEW !== "1"'),
    "the explicit dedicated-preview-database opt-in exists",
  );
  // The gate must fire BEFORE any DB work (right after client init).
  const gateIdx = SEED_FAMILY.indexOf("VERCEL_ENV");
  const firstQueryIdx = SEED_FAMILY.indexOf("db.plan.upsert");
  assert.ok(gateIdx > -1 && firstQueryIdx > gateIdx, "the gate precedes every query");
});

test("preview gate: vercel-db-sync skips on VERCEL_ENV=preview (DB_ALLOW_PREVIEW opt-in)", () => {
  assert.ok(
    DB_SYNC.includes("process.env.VERCEL_ENV === 'preview'"),
    "the gate tests VERCEL_ENV=preview",
  );
  assert.ok(
    DB_SYNC.includes("process.env.DB_ALLOW_PREVIEW !== '1'"),
    "the explicit dedicated-preview-database opt-in exists",
  );
  const gateIdx = DB_SYNC.indexOf("VERCEL_ENV");
  const pushIdx = DB_SYNC.indexOf("runPush()");
  assert.ok(gateIdx > -1 && pushIdx > gateIdx, "the gate precedes the push");
});

test("registration seam: «demo-store» is RESERVED in the slug lib", () => {
  assert.ok(SLUG_LIB.includes('"demo-store"'), "the seed-owned slug is reserved");
});

test("exit semantics: the non-blocking deploy contract survives (banner + exit 0; SEED_STRICT=1 stays strict)", () => {
  assert.ok(
    SEED_FAMILY.includes('process.env.SEED_STRICT === "1"'),
    "the strict local/QA mode is preserved",
  );
  assert.ok(
    SEED_FAMILY.includes("process.exit(0)"),
    "the non-blocking deploy exit is preserved",
  );
});
