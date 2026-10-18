// Prisma P2002 discrimination — WHICH unique constraint fired, not just
// that one did.
//
// W3-F (P21-W3-F): the public order route's insert loop retries P2002 on
// orderNumber collisions (bump the daily sequence, try again). A P2002 on
// the idempotency key is a DIFFERENT contract: a concurrent request with
// the same key committed between the route's pre-check findFirst and this
// transaction's INSERT — the twin's order already exists, and no
// orderNumber retry can ever clear the conflict (the key is identical on
// every attempt). Telling the two apart turns the raced twin back into
// the idempotent REPLAY the route's pre-check serves, instead of a raw
// 500 after the loop burns its attempts.
//
// Deliberately duck-typed (no @prisma/client import): `code === "P2002"`
// + `meta.target` is Prisma's documented shape for known request errors,
// and this module must stay importable by the dependency-free
// node:test unit battery (tests/unit/prisma-errors.test.ts).

type UnknownRecord = Record<string, unknown>;

/** Field names of a P2002's violated unique constraint, when Prisma named
 *  them (PostgreSQL always does; older engines may not, and some report
 *  the index NAME as a bare string instead of the field list). */
export function uniqueViolationFields(err: unknown): string[] {
  if (!err || typeof err !== "object") return [];
  const e = err as UnknownRecord;
  if (e.code !== "P2002") return [];
  const meta = e.meta as UnknownRecord | undefined;
  const target = meta?.target;
  if (Array.isArray(target)) return target.map((f) => String(f));
  if (typeof target === "string") return [target]; // index-name form
  return [];
}

/** True when a P2002's violated constraint includes the given field —
 *  e.g. `isUniqueViolationOn(err, "idempotencyKey")` for the Order
 *  @@unique([businessId, idempotencyKey]) race. Falls back to Prisma's
 *  human message ("Unique constraint failed on the fields: …") for
 *  engines where meta.target is absent — safe here because the field
 *  name passed by callers appears in exactly one constraint. */
export function isUniqueViolationOn(err: unknown, field: string): boolean {
  if (uniqueViolationFields(err).includes(field)) return true;
  if (!err || typeof err !== "object") return false;
  const e = err as UnknownRecord;
  if (e.code !== "P2002") return false;
  const message = e.message;
  if (typeof message !== "string") return false;
  // Prisma message form: "Unique constraint failed on the fields: (`id`, `idempotencyKey`)"
  // (some engines quote the fields, some don't — strip both quote styles)
  const fieldsMatch = message.match(/Unique constraint failed on the fields:\s*\(([^)]*)\)/);
  if (fieldsMatch) {
    return fieldsMatch[1]
      .split(",")
      .map((f) => f.trim().replace(/^[`"']+|[`"']+$/g, ""))
      .includes(field);
  }
  return false;
}

/* ── W4-E1 (P21-W4-E): retryable transaction-conflict discrimination ──
 *
 * Under a genuinely concurrent approval race (three review requests in
 * flight on one PENDING payment — observed live through the e2e battery),
 * the SQLite rollback journal turns 3+ interleaved read→write transactions
 * into a reader/writer convoy: one contender's query stalls the full
 * socket-timeout window (~5s) and dies, and its transaction siblings get
 * the collateral Transaction-API error. These are TRANSIENT states, not
 * business failures — the family money path (public/orders, r134 W2-#6)
 * established the recipe: retry the whole (idempotent-by-CAS) transaction
 * ONCE, and only a second conflict surfaces the retry copy.
 *
 *   P2034 — write conflict / deadlock (Serializable SSI aborts on PG,
 *           busy-based aborts on SQLite): Prisma's own "retry your
 *           transaction" code. THE canonical retryable.
 *   P1008 — socket timeout: the convoy casualty (the query waited on the
 *           lock past the driver timeout; nothing was committed).
 *   P2028 — Transaction API error: the collateral form (a query lands on
 *           a transaction the timeout already closed/rolled back).
 *
 * Duck-typed on { code } exactly like the P2002 discriminator above, so
 * the dependency-free node:test battery can exercise it directly.
 */
const RETRYABLE_TX_ERROR_CODES = new Set(["P2034", "P1008", "P2028"]);

/** True when the error is a transient transaction conflict the family's
 *  one-retry recipe covers — NOT a business failure (those must keep
 *  riding their own catch paths) and NOT a data error (P2002 uniqueness
 *  has its own discriminator above). */
export function isRetryableTxError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as UnknownRecord;
  return typeof e.code === "string" && RETRYABLE_TX_ERROR_CODES.has(e.code);
}
