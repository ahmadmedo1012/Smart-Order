// phase4 (W1-SO) — unit tests for the order state machine (src/lib/order-machine.ts).
// The transition table is THE domain contract: the API PATCH gate (CAS),
// the dashboard buttons, the customer tracking UI and the landing demo all
// derive from it — until now it was exercised only by the e2e happy path
// + one invalid jump. These tests pin the whole table.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  canMarkPaid,
  getAllowedTransitions,
  isTerminal,
  shouldRestockOnTransition,
  buildRestockPlan,
} from "../../src/lib/order-machine.ts";
import { ORDER_STATUSES } from "../../src/lib/constants.ts";
import type { OrderStatus } from "../../src/lib/constants.ts";

const ALL: OrderStatus[] = [...ORDER_STATUSES];
const NON_TERMINAL: OrderStatus[] = ["NEW", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];
const TERMINAL: OrderStatus[] = ["DELIVERED", "CANCELLED", "REJECTED"];

/** The full legal edge list for DELIVERY orders — the table verbatim. */
const DELIVERY_EDGES: Array<[OrderStatus, OrderStatus]> = [
  ["NEW", "CONFIRMED"],
  ["NEW", "REJECTED"],
  ["NEW", "CANCELLED"],
  ["CONFIRMED", "PREPARING"],
  ["CONFIRMED", "CANCELLED"],
  ["PREPARING", "READY"],
  ["PREPARING", "CANCELLED"],
  ["READY", "OUT_FOR_DELIVERY"],
  ["READY", "CANCELLED"],
  ["OUT_FOR_DELIVERY", "DELIVERED"],
];

test("canTransition: every legal DELIVERY edge passes", () => {
  for (const [from, to] of DELIVERY_EDGES) {
    assert.equal(canTransition(from, to, "DELIVERY"), true, `${from} → ${to} must be legal`);
  }
});

test("canTransition: PICKUP skips OUT_FOR_DELIVERY, keeps everything else", () => {
  // the branch's whole purpose: READY→OUT_FOR_DELIVERY vanishes for pickup
  assert.equal(canTransition("READY", "OUT_FOR_DELIVERY", "PICKUP"), false);
  // READY→DELIVERED stays OPEN for pickup (the courier hop is meaningless)
  assert.equal(canTransition("READY", "DELIVERED", "PICKUP"), true);
  // the other edges are identical to delivery
  for (const [from, to] of DELIVERY_EDGES) {
    if (to === "OUT_FOR_DELIVERY") continue;
    assert.equal(canTransition(from, to, "PICKUP"), true, `PICKUP ${from} → ${to} must stay legal`);
  }
});

test("canTransition: DELIVERY forces READY through OUT_FOR_DELIVERY (no direct DELIVERED)", () => {
  assert.equal(canTransition("READY", "DELIVERED", "DELIVERY"), false);
  assert.equal(canTransition("READY", "OUT_FOR_DELIVERY", "DELIVERY"), true);
});

test("canTransition: key invalid jumps are rejected", () => {
  const invalid: Array<[OrderStatus, OrderStatus]> = [
    ["NEW", "DELIVERED"], // the e2e's classic jump
    ["NEW", "READY"],
    ["NEW", "PREPARING"],
    ["NEW", "OUT_FOR_DELIVERY"],
    ["CONFIRMED", "READY"],
    ["CONFIRMED", "DELIVERED"],
    ["PREPARING", "OUT_FOR_DELIVERY"],
    ["PREPARING", "DELIVERED"],
    ["READY", "CONFIRMED"], // no backwards motion
    ["OUT_FOR_DELIVERY", "CANCELLED"], // destructive ends at dispatch
    ["OUT_FOR_DELIVERY", "READY"],
    ["OUT_FOR_DELIVERY", "PREPARING"],
  ];
  for (const [from, to] of invalid) {
    assert.equal(canTransition(from, to, "DELIVERY"), false, `${from} → ${to} must be illegal`);
    if (to !== "OUT_FOR_DELIVERY") {
      assert.equal(canTransition(from, to, "PICKUP"), false, `PICKUP ${from} → ${to} must be illegal`);
    }
  }
});

test("isTerminal + canTransition: terminal states accept nothing (not even themselves)", () => {
  for (const t of TERMINAL) {
    assert.equal(isTerminal(t), true, `${t} is terminal`);
    for (const to of ALL) {
      assert.equal(canTransition(t, to, "DELIVERY"), false, `${t} → ${to} must be illegal`);
      assert.equal(canTransition(t, to, "PICKUP"), false);
    }
  }
  for (const t of NON_TERMINAL) assert.equal(isTerminal(t), false);
});

test("CAS snapshot discipline: a transition demands the exact current status — a stale snapshot (status moved underneath) fails its planned edge", () => {
  // the route's CAS write guards the race; the machine's `from` is the
  // snapshot it validates against — edges from ANY status other than the
  // live one are the conflict case (e.g. operator saw NEW, order is
  // already CANCELLED: the planned NEW→CONFIRMED edge is gone).
  assert.equal(canTransition("CANCELLED", "CONFIRMED", "DELIVERY"), false);
  assert.equal(canTransition("REJECTED", "CONFIRMED", "DELIVERY"), false);
  assert.equal(canTransition("DELIVERED", "DELIVERED", "DELIVERY"), false); // no self-edges
  assert.equal(canTransition("CONFIRMED", "CONFIRMED", "DELIVERY"), false);
});

test("getAllowedTransitions: labels are non-empty Arabic and destructive is flag-exact", () => {
  for (const status of ALL) {
    for (const fulfillment of ["DELIVERY", "PICKUP"] as const) {
      for (const rule of getAllowedTransitions(status, fulfillment)) {
        assert.ok(rule.label.length > 0, `${status}/${fulfillment} → ${rule.to} carries a label`);
        assert.equal(
          rule.destructive ?? false,
          rule.to === "CANCELLED" || rule.to === "REJECTED",
          `destructive flag must match the terminal-reject pair (${rule.to})`,
        );
      }
    }
  }
});

test("getAllowedTransitions: shape counts — the fulfillment filters are surgical", () => {
  assert.equal(getAllowedTransitions("NEW", "DELIVERY").length, 3);
  assert.equal(getAllowedTransitions("NEW", "PICKUP").length, 3);
  assert.equal(getAllowedTransitions("READY", "DELIVERY").length, 2); // +CANCELLED (no direct DELIVERED)
  assert.equal(getAllowedTransitions("READY", "PICKUP").length, 2); // DELIVERED + CANCELLED
  assert.equal(getAllowedTransitions("OUT_FOR_DELIVERY", "DELIVERY").length, 1);
  assert.equal(getAllowedTransitions("DELIVERED", "DELIVERY").length, 0);
});

test("table exhaustiveness: every ORDER_STATUS has a defined rule list (no undefined fallthrough)", () => {
  for (const status of ALL) {
    for (const fulfillment of ["DELIVERY", "PICKUP"] as const) {
      assert.ok(Array.isArray(getAllowedTransitions(status, fulfillment)));
    }
  }
});

test("canMarkPaid: money is receivable in every non-rejected, non-cancelled state — even after delivery (COD)", () => {
  for (const status of NON_TERMINAL) {
    assert.equal(canMarkPaid(status), true, `${status} accepts PAID`);
  }
  assert.equal(canMarkPaid("DELIVERED"), true); // COD captured after handing the parcel
  assert.equal(canMarkPaid("CANCELLED"), false);
  assert.equal(canMarkPaid("REJECTED"), false);
});

/* ── P45-W1 (المبادرة C): حارس استرجاع المخزون عند الانتقال الهادم ──
 * البُناة الأنقياء خلف مسار الـPATCH — القرار (مرة-واحدة) والخطة
 * (تجميع لكل منتج متتبع) يُدبّسان هنا بلا I/O. */

test("P45-W1 shouldRestockOnTransition: destructive targets restock exactly once — the first transition only", () => {
  // الانتقال الهادم الأول: restockedAt لم يُضبط — استرجاع مستحق
  assert.equal(shouldRestockOnTransition("CANCELLED", null), true);
  assert.equal(shouldRestockOnTransition("REJECTED", null), true);
  // الطابع المضبوط يمنع التكرار (تاريخ أو سلسلة ISO — الشكلان اللذان
  // قد يصلان من Prisma) — الإلغاء الثاني بنيوياً مستحيل أصلاً (حالة
  // منتهية)، وهذا الحارس الطبقة الذرّية الثانية فوق آلة الحالات
  assert.equal(shouldRestockOnTransition("CANCELLED", new Date("2026-01-01T00:00:00Z")), false);
  assert.equal(shouldRestockOnTransition("REJECTED", "2026-01-01T00:00:00.000Z"), false);
  // الانتقالات غير الهادمة لا تسترجع شيئاً أبداً — مهما كان الطابع
  for (const to of ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] as const) {
    assert.equal(shouldRestockOnTransition(to, null), false, `${to} never restocks`);
    assert.equal(shouldRestockOnTransition(to, new Date()), false, `${to} never restocks (stamped)`);
  }
});

test("P45-W1 buildRestockPlan: aggregates quantities per tracked product — same product across lines (variants/options) sums once", () => {
  const plan = buildRestockPlan(
    [
      { productId: "p1", quantity: 2 },
      { productId: "p1", quantity: 3 }, // نفس المنتج بسطرين — يُجمَع
      { productId: "p2", quantity: 4 }, // غير متتبع — يُهمل
      { productId: null, quantity: 9 }, // منتج محذوف نظرياً — يُهمل
    ],
    new Set(["p1"]),
  );
  assert.deepEqual(plan, [{ productId: "p1", quantity: 5 }]);
});

test("P45-W1 buildRestockPlan: empty or fully-untracked baskets answer an empty plan (no ghost increments)", () => {
  assert.deepEqual(buildRestockPlan([], new Set(["p1"])), []);
  assert.deepEqual(buildRestockPlan([{ productId: "p2", quantity: 1 }], new Set()), []);
  assert.deepEqual(
    buildRestockPlan(
      [
        { productId: null, quantity: 5 },
        { productId: "pX", quantity: 5 },
      ],
      new Set(["p1"]),
    ),
    [],
  );
});
