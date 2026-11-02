// P42 (Wave 1 §1) — the plan RESOURCE-cap pins.
//
// WHAT THIS PROVES:
//   · the Free card's «3 أقسام» / «منطقة توصيل واحدة» ARE the enforced
//     caps (lib/plan-resource-caps is the decision the routes read), and
//     the paid tiers read the practical-«unlimited» bounds (500 / 200) —
//     the global 50/40 literals no card ever promised are gone;
//   · both count gates ride the in-tx W3-F row-lock contract (the
//     products/staff gate doctrine) and answer 409 PLAN_LIMIT with the
//     family cap copy carrying the plan's OWN number;
//   · W2-ORD-5 (P42-W3): the categories/zones manage pages carry the
//     per-page counter + upgrade door from the SAME source of truth that
//     refuses the POST (the staff W2-ORD-4 seats family) — the counter
//     numbers and the door boundaries are pinned so neither drifts.
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

/* ── W2-ORD-5 (P42-W3): the per-page counter + upgrade-door contract ── */

test("W2-ORD-5 GET: both list routes carry the caps from the SAME source of truth that refuses the POST", () => {
  const categories = read("../../src/app/api/categories/route.ts");
  const zones = read("../../src/app/api/delivery-zones/route.ts");
  const cases = [
    {
      src: categories,
      capFor: "categoryCapFor",
      list: "categories",
      gate: /if \(count >= cap\) \{\s*\n\s*throw new ApiFailError\(categoryCapMessage/,
    },
    {
      src: zones,
      capFor: "zoneCapFor",
      list: "zones",
      gate: /if \(count >= cap\) \{\s*\n\s*throw new ApiFailError\(zoneCapMessage/,
    },
  ];
  for (const { src, capFor, list, gate } of cases) {
    // the GET resolves the plan (db client — the GET twin of the POST's
    // in-tx read) and reads the SAME per-plan map the gate reads.
    assert.ok(
      new RegExp(`await currentPlan\\(db, member\\.businessId\\);\\s*const cap = ${capFor}\\(plan\\.name\\);`).test(src),
      `the GET resolves currentPlan + ${capFor} — the POST's own source of truth`,
    );
    // the caps object rides the list response; canCreate is the exact
    // negation of the gate comparison (count >= cap), on the same count
    // basis the GET already rendered (the merchant counts what they SEE).
    assert.ok(
      src.includes("caps: {") && src.includes(`canCreate: ${list}.length < cap`),
      "caps ride the GET with canCreate = the gate comparison negated",
    );
    assert.ok(
      src.includes(`current: ${list}.length,`) && src.includes("planNameAr: plan.nameAr,"),
      "current rides the same findMany the list renders; the plan's Arabic name rides too (the staff seats mirror)",
    );
    assert.ok(gate.test(src), "the POST gate itself is untouched (the W3-F in-tx refusal)");
  }
});

test("W2-ORD-5 boundaries: the counter reads the plan's OWN numbers and the door opens exactly where the POST refuses", () => {
  // Free — the card sells «3 أقسام» / «منطقة توصيل واحدة»: «2 من 3» keeps
  // the add button (canCreate), «3 من 3» opens the door; «0 من 1» keeps it,
  // «1 من 1» opens it — on Free the FIRST zone is also the LAST.
  assert.equal(categoryCapFor("Free"), 3);
  assert.equal(zoneCapFor("Free"), 1);
  assert.ok(2 < categoryCapFor("Free"), "Free categories at 2: the button stays");
  assert.ok(!(3 < categoryCapFor("Free")), "Free categories at 3: the door opens (the 409 becomes visible BEFORE the form)");
  assert.ok(0 < zoneCapFor("Free"), "Free zones at 0: the button stays");
  assert.ok(!(1 < zoneCapFor("Free")), "Free zones at 1: the door opens");
  // Paid — the register's documented meaning of «غير محدودة» (500/200):
  // the counter shows the ENFORCED bound itself, exactly as the staff chip
  // shows its 9999 — the wall is visible long before it is hit, never a
  // surprise 409.
  assert.ok(499 < categoryCapFor("Basic") && !(500 < categoryCapFor("Basic")), "paid categories: door at 500, not before");
  assert.ok(199 < zoneCapFor("Basic") && !(200 < zoneCapFor("Basic")), "paid zones: door at 200, not before");
  assert.equal(categoryCapFor("Premium"), PAID_CATEGORY_CAP);
  assert.equal(zoneCapFor("Pro"), PAID_ZONE_CAP);
});

test("W2-ORD-5 pages: both manage pages render the Arabic counter + the upgrade door from the SAME endpoint", () => {
  const categories = read("../../src/app/dashboard/categories/page.tsx");
  const zones = read("../../src/app/dashboard/delivery/page.tsx");
  const cases = [
    {
      src: categories,
      endpoint: "/api/categories?businessId=",
      counter: "الأقسام: {caps.current} من {caps.max}",
      door: "أقسام أكثر — رقّ خطتك",
    },
    {
      src: zones,
      endpoint: "/api/delivery-zones?businessId=",
      counter: "مناطق التوصيل: {caps.current} من {caps.max}",
      door: "مناطق أكثر — رقّ خطتك",
    },
  ];
  for (const { src, endpoint, counter, door } of cases) {
    assert.ok(src.includes(endpoint), "the page reads the SAME endpoint that refuses the POST");
    assert.ok(src.includes("caps.canCreate"), "the door condition is the API's own canCreate (never a page-side recount)");
    assert.ok(src.includes(counter), `the honest counter chip reads «${counter}»`);
    assert.ok(src.includes(door), `the upgrade door copy «${door}» (the staff W2-ORD-4 tone)`);
    assert.ok(src.includes('href="/pricing"'), "the door links to /pricing (the family's upgrade destination)");
  }
});

