// DB-backed rate limiter (Prisma RateLimitEntry) with an in-memory fast
// path — port of the smart-menu-real twin (src/lib/rate-limit.ts,
// "single source of truth across Vercel instances"), adapted to SO's
// sync call sites (r132-F1a, A10-quality #4).
//
// WHY THIS EXISTS: the previous Map-only limiter was per-lambda — on
// Vercel every warm instance carried its OWN bucket, so "login: 10 per
// 10 min per IP" was really 10-per-instance and an attacker spreading
// requests over warm instances got a multiple of the published budget
// (brute-force damping on the auth paths was theater). SO hardened the
// KEY (client-ip.ts spoof-collapse) but left the bucket store
// per-instance; SM hit the same wall and moved the store to PostgreSQL.
//
// SHAPE (SO call-site constraint, r134 update): ALL six call sites now
// consume the limiter via the awaited authoritative twin below
// (`const rl = await dbRateLimit(...)`); the legacy sync `rateLimit()`
// shim stays exported for any future call site that cannot await — it
// still works as:
//
//   1. FAST PATH (sync, zero added latency): the in-memory bucket
//      decides — same behavior as before when the DB is unreachable.
//   2. WRITE-THROUGH (async, fire-and-forget): every check upserts the
//      global DB counter (SM's bucket-aligned fixed-window upsert).
//   3. RECONCILE: the DB's global count REPLACES the local bucket — a
//      fresh lambda inherits the GLOBAL budget on its first check, so
//      N instances can no longer multiply the budget by N. Residual
//      overshoot is bounded by one DB round-trip per instance.
//
// `dbRateLimit()` is the authoritative awaited twin (SM's check()
// verbatim: single round trip, fail-closed) for call sites that CAN
// await. r134 (W2 #8): the r132 handoff list is COMPLETE — all six call
// sites adopted it (api/auth/login, api/auth/register, api/public/orders,
// api/media, api/subscriptions, api/subscriptions/receipt); the sync
// shim has zero callers and remains as the documented fallback.
//
// Failure semantics: DB unreachable → the local bucket still counts and
// enforces per-instance (the pre-r132 behavior — never worse). The
// authoritative twin fails CLOSED (SM semantics).

import { db } from "@/lib/db";
// The spoof-hardened resolver (Vercel x-real-ip / trust-depth XFF +
// canonicalization) — one client cannot occupy two limiter buckets.
// Re-exported under the legacy name so the six call sites keep their
// `import { clientIp } from "@/lib/rate-limit"` unchanged.
import { getClientIp } from "@/lib/client-ip";

export { getClientIp as clientIp };

// round90-F4 (SM red-team r90-D2), ported: probabilistic TABLE-level
// sweep tuning — the 120s interval below doesn't run reliably on
// serverless (frozen lambdas) and single-use keys never appear again,
// so expired rows would pile up silently (~14K/day on SM pre-fix).
const SWEEP_CHANCE = 1 / 32;
/** Rows deleted per sweep — bounds the work regardless of table size. */
const SWEEP_BATCH = 512;
/** Expired rows linger at most this long before becoming sweepable. */
const SWEEP_RETENTION_MS = 60_000;

interface LocalBucket {
  count: number;
  windowEnd: number; // epoch ms — the fixed-window deadline this bucket belongs to
}

const buckets = new Map<string, LocalBucket>();

/** SM round-86, ported: align to the START of the current window so all
 * requests within the same window share ONE (key, windowEnd) row (a
 * per-request deadline would mint a new row every check and the count
 * would never accumulate). */
function windowDeadline(now: number, windowMs: number): number {
  const bucketStart = Math.floor(now / windowMs) * windowMs;
  return bucketStart + windowMs;
}

async function upsertGlobalCount(key: string, deadline: number): Promise<number | null> {
  try {
    const entry = await db.rateLimitEntry.upsert({
      where: { key_windowEnd: { key, windowEnd: new Date(deadline) } },
      create: { key, windowEnd: new Date(deadline), count: 1 },
      update: { count: { increment: 1 } },
      select: { count: true },
    });
    return entry.count;
  } catch {
    // unique-constraint race under concurrency (two creators of the same
    // bucket row) — the row exists; read it back as the fallback (SM
    // round85-B5 pattern).
    try {
      const entry = await db.rateLimitEntry.findUnique({
        where: { key_windowEnd: { key, windowEnd: new Date(deadline) } },
        select: { count: true },
      });
      return entry?.count ?? null;
    } catch {
      return null; // DB down — local bucket keeps counting (pre-r132 behavior)
    }
  }
}

/** Adopt the global count into the local bucket (write-through step 3).
 * Best-effort: a window rollover mid-flight simply discards the result. */
function reconcileLocal(key: string, deadline: number, globalCount: number): void {
  const bucket = buckets.get(key);
  if (bucket && bucket.windowEnd === deadline) {
    // Never regress below what this instance already counted (in-flight
    // races); the global count is the converging truth.
    bucket.count = Math.max(bucket.count, globalCount);
  }
}

/** SM round90-F4, ported: probabilistic table-level sweep (~1/32 of
 * checks) — bounded batch delete of rows expired past the retention
 * window (windowEnd is indexed). A sweep failure never affects the
 * limit decision. */
async function maybeSweep(now: number): Promise<void> {
  if (Math.random() >= SWEEP_CHANCE) return;
  try {
    const cutoff = new Date(now - SWEEP_RETENTION_MS);
    const stale = await db.rateLimitEntry.findMany({
      where: { windowEnd: { lt: cutoff } },
      select: { id: true },
      take: SWEEP_BATCH,
    });
    if (stale.length > 0) {
      await db.rateLimitEntry.deleteMany({ where: { id: { in: stale.map((r) => r.id) } } });
    }
  } catch {
    /* best effort */
  }
}

/** Legacy sync limiter — identical signature to the pre-r132 in-memory
 * version (call sites unchanged), now with DB write-through + reconcile
 * so the budget is enforced ACROSS instances. See the module header. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const deadline = windowDeadline(now, windowMs);

  // 1. fast path — the local (reconciled) bucket decides synchronously
  const bucket = buckets.get(key);
  let count: number;
  if (!bucket || bucket.windowEnd !== deadline) {
    count = 1;
    buckets.set(key, { count, windowEnd: deadline });
  } else {
    bucket.count += 1;
    count = bucket.count;
  }

  const ok = count <= limit;

  // 2+3. write-through + reconcile, fire-and-forget — never blocks the
  // request, never throws (all failure paths collapse to the local view)
  void (async () => {
    const globalCount = await upsertGlobalCount(key, deadline);
    if (globalCount !== null) reconcileLocal(key, deadline, globalCount);
    await maybeSweep(Date.now());
  })().catch(() => {
    /* best effort — the local bucket already counted this request */
  });

  return { ok, retryAfterSec: ok ? 0 : Math.ceil((deadline - now) / 1000) };
}

/** Authoritative DB-backed limiter — SM's check() verbatim (single
 * round trip, fail-closed on DB error). For call sites that can await;
 * adopting it one file at a time replaces the local fast path with the
 * global truth entirely. Also mirrors its result into the local bucket
 * so sync callers on the same instance converge. */
export async function dbRateLimit(key: string, limit: number, windowMs: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  const now = Date.now();
  const deadline = windowDeadline(now, windowMs);

  let globalCount = await upsertGlobalCount(key, deadline);
  if (globalCount === null) {
    // DB error on both the upsert and the read: fail CLOSED (SM
    // semantics — public abuse surfaces do not fail open).
    globalCount = limit + 1;
  } else {
    reconcileLocal(key, deadline, globalCount);
  }
  await maybeSweep(now);

  const ok = globalCount <= limit;
  return { ok, retryAfterSec: ok ? 0 : Math.ceil((deadline - now) / 1000) };
}

/** Periodic sweep of the in-memory map (keeps the fast path bounded) —
 * the DB rows are swept probabilistically above. */
if (typeof setInterval !== "undefined") {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.windowEnd <= now) buckets.delete(k);
  }, 60_000);
  if (typeof timer === "object" && "unref" in timer) timer.unref();
}
