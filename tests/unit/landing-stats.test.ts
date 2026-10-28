// P30-B (§7 data truth) — the landing counters' full behavioral gate.
//
// WHAT THIS PROVES (against a REAL dedicated SQLite database — the
// e2e-seed.mjs dedicated-universe doctrine, never the dev db): the
// landing roadmark board («متجر على الطريق» / «طلب عبر المنصّة») and
// the trust pill («أكثر من N متجر يثقون بنا») count ONLY genuine
// stores and their orders:
//   · QA-fixture businesses (published + active!) are NOT counted —
//     the exact production defect (7 fixtures inflated «+9 متجر»)
//   · QA-fixture-business orders are NOT counted
//   · the flagship demo store IS counted (a real functioning surface)
//   · real merchants ARE counted; unpublished/inactive stores are not
//
// WHY HERE (not in the e2e battery): the landing page is ISR-60s —
// within one battery run the counters would serve the cached
// pre-fixture HTML and the gate would pass vacuously. The stats seam
// (lib/landing-stats.ts, extracted for exactly this) queries the DB
// directly — deterministic, no cache window.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const DB_FILE = "prisma/db/landing-stats-test.db"; // prisma resolves SQLite paths relative to the schema file
const DB_URL = `file:./db/landing-stats-test.db`;
const ROOT = fileURLToPath(new URL("../..", import.meta.url));

test("landing counters: QA fixtures stay out, real + demo stores ride (real DB)", async () => {
  // ── dedicated universe: fresh DB, schema pushed, never the dev db ──
  assert.ok(!DB_URL.includes("smart-order.db"), "never the dev db");
  rmSync(`${ROOT}/${DB_FILE}`, { force: true });
  const push = spawnSync(
    "npx",
    ["prisma", "db", "push", "--schema=prisma/schema.prisma", "--skip-generate"],
    { cwd: ROOT, env: { ...process.env, DATABASE_URL: DB_URL }, encoding: "utf8" },
  );
  assert.equal(push.status, 0, `db push failed:\n${push.stdout}\n${push.stderr}`);

  // env BEFORE the db import (PrismaClient reads it at construction)
  process.env.DATABASE_URL = DB_URL;
  const { getLandingStats } = await import("../../src/lib/landing-stats.ts");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  try {
    const plans = await db.plan.create({
      data: { name: "Free", nameAr: "مجاني", price: 0, periodDays: 30, maxProducts: 15, maxOrders: 100, sortOrder: 1, features: "[]" },
    });
    const published = { isActive: true, isPublished: true, planId: plans.id };
    const mk = (slug: string, name: string, extra = {}) =>
      db.business.create({ data: { slug, name, city: "طرابلس", phone: "0910000000", ...published, ...extra } });

    // 1 QA fixture store — PUBLISHED + ACTIVE (the production state)
    const fixture = await mk("mkhbz-alakhtbar-a", "مخبز الاختبار أ");
    // 1 QA fixture from a re-run (the suffixed shape)
    await mk("mkhbz-alakhtbar-a-2", "مخبز الاختبار أ 2");
    // 1 real merchant + the flagship demo (both published)
    const real = await mk("mtam-brqa-aldhhby", "مطعم برقة الذهبي");
    const demo = await mk("demo-store", "مخبز الواحة — تجريبي");
    // 1 unpublished real store + 1 inactive real store (never counted)
    await db.business.create({ data: { slug: "unpub", name: "متجر غير منشور", city: "طرابلس", phone: "0910000000", isActive: true, isPublished: false, planId: plans.id } });
    await db.business.create({ data: { slug: "inact", name: "متجر موقوف", city: "طرابلس", phone: "0910000000", isActive: false, isPublished: true, planId: plans.id } });

    // orders: 3 under the fixture, 2 under real, 1 under demo
    // (the Order model's required shape: number/token/type/Int totals)
    let seq = 0;
    const order = (businessId: string) =>
      db.order.create({
        data: {
          businessId,
          orderNumber: `LS-${++seq}`,
          publicToken: `ls-test-token-${seq}`,
          fulfillmentType: "DELIVERY",
          subtotal: 10_000,
          total: 10_000,
          customerName: "زبون",
          customerPhone: "0910000000",
          status: "PENDING",
        },
      });
    await order(fixture.id); await order(fixture.id); await order(fixture.id);
    await order(real.id); await order(real.id);
    await order(demo.id);

    const stats = await getLandingStats();

    // ── the gate: 2 stores (real + demo), 3 orders (2 real + 1 demo) ──
    assert.equal(stats.totalStores, 2, `expected 2 counted stores, got ${stats.totalStores} (fixture/unpublished/inactive must stay out)`);
    assert.equal(stats.totalOrders, 3, `expected 3 counted orders, got ${stats.totalOrders} (fixture-business orders must stay out)`);
  } finally {
    await db.$disconnect();
    rmSync(`${ROOT}/${DB_FILE}`, { force: true });
    assert.ok(!existsSync(`${ROOT}/${DB_FILE}`), "dedicated test db cleaned up");
  }
});
