// P42 (Wave 1 §1) — the plan RESOURCE-cap pins.
//
// WHAT THIS PROVES:
//   · the Free card's «3 أقسام» / «منطقة توصيل واحدة» ARE the enforced
//     caps (lib/plan-resource-caps is the decision the routes read), and
//     the paid tiers read the practical-«unlimited» bounds (500 / 200) —
//     the global 50/40 literals no card ever promised are gone;
//   · both count gates ride the in-tx W3-F row-lock contract (the
//     products/staff gate doctrine) and answer 409 PLAN_LIMIT with the
//     family cap copy carrying the plan's OWN number.
//
// STYLE: the pure module is tested BEHAVIORALLY (node --test reads it
// bare — the plan-entitlements-core seam contract); the routes are pinned
// as SOURCE CONTRACTS (the plan-claims.test.ts pattern — routes import
// the database seam and cannot load under plain node).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_CAPS_BY_PLAN,
  PAID_CATEGORY_CAP,
  ZONE_CAPS_BY_PLAN,
  PAID_ZONE_CAP,
  categoryCapFor,
  zoneCapFor,
  categoryCapMessage,
  zoneCapMessage,
} from "../../src/lib/plan-resource-caps.ts";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/* ── the maps: the cards' own numbers are the contract ── */

test("map: Free carries the card's own category cap (3) — the only plan that names a number", () => {
  assert.equal(CATEGORY_CAPS_BY_PLAN.Free, 3);
});

test("map: Free carries the card's own zone cap (1) — «منطقة توصيل واحدة»", () => {
  assert.equal(ZONE_CAPS_BY_PLAN.Free, 1);
});

test("behavior: every paid tier reads the practical-«unlimited» bounds (500 categories / 200 zones)", () => {
  // Basic sells «أقسام غير محدودة» / «مناطق توصيل متعددة»; Premium/Pro
  // inherit. The sanity bound — not a literal «unlimited» — is the paid
  // fallback (the retired GLOBAL gates were 50/40, tighter than any card).
  for (const paid of ["Basic", "Premium", "Pro"]) {
    assert.equal(categoryCapFor(paid), PAID_CATEGORY_CAP, `${paid} categories`);
    assert.equal(zoneCapFor(paid), PAID_ZONE_CAP, `${paid} zones`);
  }
  assert.equal(PAID_CATEGORY_CAP, 500);
  assert.equal(PAID_ZONE_CAP, 200);
});

test("behavior: the retired global literals never come back (50/40 answered no card)", () => {
  for (const cap of [categoryCapFor("Basic"), categoryCapFor("Premium"), categoryCapFor("Pro")]) {
    assert.notEqual(cap, 50);
  }
  for (const cap of [zoneCapFor("Basic"), zoneCapFor("Premium"), zoneCapFor("Pro")]) {
    assert.notEqual(cap, 40);
  }
});

test("copy: the refusal carries the plan's OWN number in the family product-limit wording", () => {
  assert.equal(
    categoryCapMessage(3),
    "لقد وصلت للحد الأقصى للأقسام (3) في خطتك. قم بترقية خطتك لإضافة المزيد.",
  );
  assert.equal(
    zoneCapMessage(1),
    "لقد وصلت للحد الأقصى لمناطق التوصيل (1) في خطتك. قم بترقية خطتك لإضافة المزيد.",
  );
});

/* ── the routes: the enforcement contract (source pins) ── */

test("routes: both count gates read the map behind the in-tx row lock and answer 409 PLAN_LIMIT", () => {
  const categories = read("../../src/app/api/categories/route.ts");
  const zones = read("../../src/app/api/delivery-zones/route.ts");
  const cases = [
    { src: categories, capFor: "categoryCapFor", capMsg: "categoryCapMessage", count: "tx.category.count" },
    { src: zones, capFor: "zoneCapFor", capMsg: "zoneCapMessage", count: "tx.deliveryZone.count" },
  ];
  for (const { src, capFor, capMsg, count } of cases) {
    assert.ok(src.includes(capFor), `the gate must read the per-plan map (${capFor})`);
    assert.ok(src.includes(capMsg), `the refusal must use the family copy (${capMsg})`);
    assert.ok(
      src.includes("ApiFailError") && src.includes('"PLAN_LIMIT"') && src.includes("409"),
      "the refusal is a 409 PLAN_LIMIT thrown from inside the tx",
    );
    assert.ok(
      src.includes("await tx.business.update") && src.includes(count),
      "count + create share one transaction behind the business-row lock (W3-F)",
    );
    // the currentPlan twin: null/expired resolves to the Free ROW before the map read
    assert.ok(
      src.includes('where: { name: "Free" }') && src.includes("subscriptionEnds"),
      "currentPlan resolves null/expired to the Free row",
    );
  }
});

/* ── §2: the dashboard badge truth — the stats route's plan is NEVER null ── */

test("stats (§2): a null/expired plan resolves to the Free ROW — the badge speaks the enforced plan", () => {
  const stats = read("../../src/app/api/dashboard/stats/route.ts");
  // every currentPlan twin in the API enforces null planId (the register
  // flow writes none) and an expired paid window as Free — the stats route
  // must resolve the SAME identity, never re-report the raw null.
  assert.ok(
    stats.includes("subscriptionEnds") && /planExpired/.test(stats),
    "the expired-paid window resolves as Free (the currentPlan contract)",
  );
  assert.ok(
    stats.includes('where: { name: "Free" }'),
    "a null planId resolves to the Free plan ROW (the badge truth)",
  );
  assert.ok(
    !stats.includes("plan: planInfo?.plan ?? null"),
    "the retired `plan: planInfo?.plan ?? null` shape never returns (it said «اختر باقة» about a Free-gated business)",
  );
  assert.ok(
    /return ok\(\{\s*plan,/.test(stats),
    "the RESOLVED plan rides the response",
  );
  // cold-table fail-closed twin: the literal Free fallback keeps the badge
  // truthful even when the plans table was never seeded.
  assert.ok(
    /nameAr: "مجاني", price: 0, maxProducts: 15, maxOrders: 100/.test(stats),
    "the literal tail fails closed to the Free card's own numbers",
  );
});

