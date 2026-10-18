// W4-E1 (P21-W4-E) — transactional-contract regression pins for the W3-F
// concurrency fixes (85446b8 · 5106777 · cba655a) and the money-path
// invariants they lean on.
//
// WHY SOURCE-CONTRACT (and not behavior) for the plan-gate row lock:
// the phantom race 5106777 closes lives at READ COMMITTED on PostgreSQL
// (two count-then-insert txs both count cap−1 and both insert). The local
// sandbox runs the SQLite twin, where Prisma interactive transactions
// BEGIN IMMEDIATE — every $transaction takes the database write lock up
// front and serializes against the file, so a concurrent twin ALWAYS
// re-counts after the first commit and the gate fires even WITHOUT the
// business-row lock (verified empirically: two PrismaClient instances,
// forced mid-tx stalls, both patterns serialize cleanly). The observable
// difference only exists on engines where readers don't block writers —
// so the pin asserts the tx-body SHAPE that closes the race there:
//
//   1. the business-row UPDATE is the FIRST statement of the gate tx
//      (row-level X lock held to commit; a concurrent twin blocks at its
//      own lock write, then re-counts and the gate fires), and
//   2. the audit row rides the SAME transaction (r134/W2-#13 doctrine —
//      a crash between commit and a post-tx audit write left the
//      mutation un-audited).
//
// Reverting 5106777 fails these assertions on the spot (proven in the
// W4-E1 defect-injection worktree): the first statement reverts to the
// plan read and PRODUCT_CREATED/STAFF_ADDED return to post-tx
// db.auditLog.create writes.
//
// The two races that ARE behaviorally expressible on the SQLite twin —
// the idempotency twin (85446b8: the pre-check read happens OUTSIDE the
// tx, so the read-then-write window survives BEGIN IMMEDIATE and the
// @@unique constraint really fires) and the subscription review
// double-apply (cba655a: unconditional writes both land) — carry their
// behavioral pins in the e2e battery (tests/e2e/api-e2e.js, "raced"
// sections). The assertions here for those routes pin the WIRING so a
// future refactor cannot silently drop the discriminator/CAS while the
// e2e harness is not running.
//
// Pure node:test + fs — the battery stays dependency-free like its
// siblings (prisma-errors.test.ts convention).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

/** Comments out — the contract is about statements, not narration. */
const stripped = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");

/**
 * Extracts the body of the first interactive transaction callback that
 * appears at/after `anchor` (e.g. `db.$transaction(`). Fails loudly when
 * the anchor exists but no `async (tx) => {` callback follows — that is
 * exactly the pre-CAS shape (a $transaction([...]) array of independent
 * writes), which these pins exist to reject.
 */
function txCallbackBody(src: string, anchor: string): string {
  const i = src.indexOf(anchor);
  assert.notEqual(i, -1, `anchor not found: ${anchor}`);
  const j = src.indexOf("async (tx) => {", i);
  assert.notEqual(j, -1, `no interactive (tx) callback after ${anchor} — array-form $transaction([...]) is the pre-fix shape`);
  const open = j + "async (tx) => ".length; // index of the opening '{'
  let depth = 0;
  for (let k = open; k < src.length; k++) {
    if (src[k] === "{") depth++;
    else if (src[k] === "}") {
      depth--;
      if (depth === 0) return src.slice(open + 1, k);
    }
  }
  assert.fail(`unbalanced braces while extracting tx body after ${anchor}`);
}

const productsSrc = stripped(read("../../src/app/api/products/route.ts"));
const staffSrc = stripped(read("../../src/app/api/staff/route.ts"));
const ordersPublicSrc = stripped(read("../../src/app/api/public/orders/route.ts"));
const ordersPatchSrc = stripped(read("../../src/app/api/orders/[id]/route.ts"));
const reviewSrc = stripped(read("../../src/app/api/subscriptions/[id]/review/route.ts"));

/* ═══ 5106777 — the plan-gate business row lock (products) ═══ */

test("products gate (5106777): the business-row UPDATE is the FIRST statement of the gate transaction", () => {
  const body = txCallbackBody(productsSrc, "db.$transaction(");
  assert.match(
    body.trimStart(),
    /^await tx\.business\.update\(\s*\{\s*where:\s*\{\s*id:\s*member\.businessId\b/,
    "the tx must open with the row-level lock on the SAME business row the cap counts — count-then-insert without it is the READ-COMMITTED phantom",
  );
});

test("products gate: cap count + create stay INSIDE the transaction (W2-D2 contract)", () => {
  const body = txCallbackBody(productsSrc, "db.$transaction(");
  assert.match(body, /await tx\.product\.count\(/, "count rides the tx");
  assert.match(body, /await tx\.product\.create\(/, "create rides the tx");
  assert.match(body, /plan\.maxProducts/, "the plan's own cap is the gate");
  assert.match(body, /"PLAN_LIMIT"/, "rejections surface the plan-limit contract");
});

test("products gate (5106777): the PRODUCT_CREATED audit row rides the SAME transaction — never a post-tx write", () => {
  const body = txCallbackBody(productsSrc, "db.$transaction(");
  assert.match(body, /await tx\.auditLog\.create\(/, "audit write inside the tx");
  assert.match(body, /action:\s*"PRODUCT_CREATED"/, "the PRODUCT_CREATED stamp");
  assert.equal(
    productsSrc.includes("db.auditLog.create"),
    false,
    "a post-tx db.auditLog.create resurrects the crash window (mutation committed, audit lost)",
  );
});

/* ═══ 5106777 — the plan-gate business row lock (staff) ═══ */

test("staff gate (5106777): the business-row UPDATE is the FIRST statement of the seat transaction", () => {
  const body = txCallbackBody(staffSrc, "db.$transaction(");
  assert.match(
    body.trimStart(),
    /^await tx\.business\.update\(\s*\{\s*where:\s*\{\s*id:\s*member\.businessId\b/,
    "the seat tx must open with the row-level lock on the counted business row",
  );
});

test("staff gate: seat count + membership insert stay INSIDE the transaction (W2-D2 contract)", () => {
  const body = txCallbackBody(staffSrc, "db.$transaction(");
  assert.match(body, /await tx\.businessMember\.count\(/, "seat count rides the tx");
  assert.match(body, /await tx\.businessMember\.create\(/, "membership insert rides the tx");
  assert.match(body, /"PLAN_LIMIT"/, "rejections surface the plan-limit contract");
});

test("staff gate (5106777): the STAFF_ADDED audit row rides the SAME transaction — never a post-tx write", () => {
  const body = txCallbackBody(staffSrc, "db.$transaction(");
  assert.match(body, /await tx\.auditLog\.create\(/, "audit write inside the tx");
  assert.match(body, /action:\s*"STAFF_ADDED"/, "the STAFF_ADDED stamp");
  assert.equal(
    staffSrc.includes("db.auditLog.create"),
    false,
    "a post-tx db.auditLog.create resurrects the crash window",
  );
});

/* ═══ money path — Serializable + P2034 retry + in-tx plan gate ═══ */

test("money path: the orders transaction runs at Serializable isolation", () => {
  assert.match(
    ordersPublicSrc,
    /isolationLevel:\s*"Serializable"/,
    "the checkout money path must run the gate + insert under Serializable (r134/r136 contract)",
  );
});

test("money path: a P2034 serialization abort retries the WHOLE transaction exactly once", () => {
  assert.match(ordersPublicSrc, /code\s*===\s*"P2034"/, "P2034 is caught");
  const reruns = ordersPublicSrc.match(/await runOrderTx\(\)/g) ?? [];
  assert.ok(
    reruns.length >= 2,
    `the original call plus the retry — found ${reruns.length} runOrderTx() invocations`,
  );
});

test("money path: the monthly plan-limit gate stays INSIDE the Serializable transaction", () => {
  const body = txCallbackBody(ordersPublicSrc, "db.$transaction(");
  assert.match(body, /await tx\.order\.count\(/, "the month's count rides the tx");
  assert.match(body, /tripoliMonthStart\(\)/, "Tripoli-month accounting");
  assert.match(body, /"PLAN_LIMIT"/, "the gate surfaces the plan-limit contract");
});

test("idempotency wiring (85446b8): the P2002 discriminator guards the insert loop AND the POST catch", () => {
  const wired = ordersPublicSrc.match(/isUniqueViolationOn\(/g) ?? [];
  assert.ok(
    wired.length >= 3,
    `loop break + catch + retry-catch — found ${wired.length} isUniqueViolationOn( call sites`,
  );
});

/* ═══ PATCH — the orders status-machine CAS (r140 P3-1) ═══ */

test("orders PATCH: the write is CAS-guarded on the status snapshot (updateMany where + count assert)", () => {
  const body = txCallbackBody(ordersPatchSrc, "db.$transaction(");
  assert.match(body, /await tx\.order\.updateMany\(/, "conditional write");
  assert.match(body, /status:\s*order\.status/, "the where clause pins the READ snapshot's status");
  assert.match(body, /cas\.count\s*!==\s*1/, "the count assert turns a lost race into a 409, not a silent overwrite");
});

/* ═══ cba655a — the subscription review CAS ═══ */

test("review approval (cba655a): the stamp is a CAS on PENDING and the business upgrade rides the SAME transaction", () => {
  const body = txCallbackBody(reviewSrc, "db.$transaction(");
  assert.match(
    body,
    /tx\.subscriptionPayment\.updateMany\(\s*\{\s*where:\s*\{\s*id,\s*status:\s*"PENDING"/,
    "the approval write must be conditional on the PENDING snapshot (the orders-PATCH CAS recipe)",
  );
  assert.match(body, /cas\.count\s*!==\s*1/, "the loser surfaces the already-reviewed 409");
  assert.match(body, /await tx\.business\.update\(/, "the business upgrade commits atomically with the stamp");
  assert.equal(
    reviewSrc.includes("db.$transaction(["),
    false,
    "the array-form $transaction([...]) of independent writes is the pre-CAS double-apply shape",
  );
});

test("review rejection (cba655a): the reject branch is the same conditional PENDING write", () => {
  assert.match(
    reviewSrc,
    /db\.subscriptionPayment\.updateMany\(\s*\{\s*where:\s*\{\s*id,\s*status:\s*"PENDING"/,
    "REJECT must not stamp over a concurrent APPROVE",
  );
  assert.match(reviewSrc, /casReject\.count\s*!==\s*1/);
});

test("review route (W4-E1): both writes are guarded by the one-retry transient-conflict recipe", () => {
  // found live by the raced-approval battery: a 3-way race starved one
  // contender past the SQLite socket timeout → raw 500 (P1008/P2028)
  const guarded = reviewSrc.match(/withTxRetry\(/g) ?? [];
  assert.ok(
    guarded.length >= 2,
    `the approve transaction and the reject conditional update — found ${guarded.length} withTxRetry( call sites`,
  );
  assert.match(reviewSrc, /const withTxRetry/, "the guard itself is declared");
  assert.match(reviewSrc, /isRetryableTxError\(/, "the transient-conflict discriminator is wired in");
  assert.match(reviewSrc, /"WRITE_CONFLICT"/, "a second conflict surfaces the family retry copy, never a raw 500");
});

test("review route (W5-C4): the single retry is preceded by a randomized 25–75ms jitter — the convoy de-synchronizer", () => {
  /* W5-A4 P3: the battery's one observed flake ([503,503,503] — zero
     winners, all contenders exhausted the one-retry recipe) was three
     retriers re-colliding in lockstep the instant their rollback
     journals released. The randomized pre-retry delay spreads the
     convoy so a fresh SQLite attempt actually wins the write lock.
     Semantics unchanged: still ONE retry, same 503 copy, the CAS
     still pins the single application — only the TIMING moves. */
  const guard = reviewSrc.slice(reviewSrc.indexOf("const withTxRetry"));
  assert.match(
    guard,
    /setTimeout\(resolve, 25 \+ Math\.random\(\) \* 50\)/,
    "the pre-retry delay must be the randomized 25–75ms window, not a fixed sleep",
  );
  // the delay rides the RETRY path only — after the transient-conflict
  // gate, never in front of the first attempt.
  const gate = guard.indexOf("isRetryableTxError(err)");
  const delay = guard.indexOf("setTimeout(resolve");
  assert.ok(
    gate !== -1 && delay > gate,
    "jitter fires after the isRetryableTxError gate and before the single retry",
  );
});
